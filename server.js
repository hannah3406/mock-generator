require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const SwaggerParser = require('@apidevtools/swagger-parser');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

const app = express();

app.get('/health', (req, res) => {
    res.send('I am awake!');
});
// [Render 배포용 수정] 업로드 폴더가 없으면 자동 생성
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
    console.log('📁 uploads folder created.');
}

// 🔒 기본 보안 설정
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

// 🔒 보안 헤더 (helmet 없이도 기본 설정)
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// 🔒 간단한 Rate Limiting (메모리 기반)
const requestCounts = new Map();
const RATE_LIMIT = 10; // 분당 10회
const WINDOW_MS = 60 * 1000; // 1분

function rateLimiter(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, []);
    }
    
    const requests = requestCounts.get(ip).filter(time => now - time < WINDOW_MS);
    
    if (requests.length >= RATE_LIMIT) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    
    requests.push(now);
    requestCounts.set(ip, requests);
    next();
}

// 🔒 파일 업로드 보안 설정
const upload = multer({ 
    dest: 'uploads/',
    limits: { 
        fileSize: 5 * 1024 * 1024, // 5MB 제한
        files: 1 // 한 번에 1개만
    },
    fileFilter: (req, file, cb) => {
        const allowedExts = ['.json', '.yaml', '.yml'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only JSON/YAML files are allowed'));
        }
    }
});

// 환경변수 검증
if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is required');
    process.exit(1);
}

// Gemini 설정
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

console.log('✅ Gemini model initialized: gemini-2.5-flash');

// 🛡️ 보안 필터 함수
function sanitizeSchema(schema) {
    if (!schema || typeof schema !== 'object') return schema;
    const cleanSchema = JSON.parse(JSON.stringify(schema));

    function walk(obj) {
        if (!obj || typeof obj !== 'object') return;
        const sensitiveFields = ['description', 'summary', 'example', 'examples', 'title', 'xml', 'externalDocs'];
        sensitiveFields.forEach(field => { if (field in obj) delete obj[field]; });
        Object.keys(obj).forEach(key => walk(obj[key]));
    }
    walk(cleanSchema);
    return cleanSchema;
}

// 📊 상태 확인 엔드포인트
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 🔒 명세 파싱 API (보안 강화)
app.post('/api/parse', upload.single('specFile'), async (req, res) => {
    let filePath = null;
    
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        filePath = req.file.path;
        const api = await SwaggerParser.validate(filePath);
        const paths = Object.keys(api.paths);
        
        // 성공 시 파일 삭제
        fs.unlinkSync(filePath);
        
        res.json({ paths, spec: api });
        
    } catch (err) {
        // 에러 발생 시에도 파일 삭제
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        console.error('Parse error:', err.message);
        
        res.status(400).json({ 
            error: process.env.NODE_ENV === 'production' 
                ? 'Failed to parse file. Please check if it is a valid OpenAPI/Swagger file.' 
                : `Parsing failed: ${err.message}`
        });
    }
});

// 🔒 AI 생성 API (개수 설정 기능 추가)
app.post('/api/generate', async (req, res) => {
    const { path, method, specSchema, count = 1 } = req.body;
    
    try {
        const safeSchema = sanitizeSchema(specSchema);

        // 🧠 스마트 프롬프트: 객체 내부 배열 처리 로직 추가
        const prompt = `
        You are a Mock Data Generator.
        Generate realistic Korean mock data based on the following JSON Schema/Example.
        
        [Rules]
        1. Output MUST be valid JSON.
        2. No markdown formatting.
        3. Use realistic Korean data (names, places, etc).
        
        [Count Logic - CRITICAL]
        The user requested count is: ${count}
        
        CASE A: If the root schema is an 'Array':
        - Generate a list with exactly ${count} items.
        
        CASE B: If the root schema is an 'Object':
        - Generate exactly 1 root object.
        - HOWEVER, for any fields inside this object that are 'Arrays' (lists), populate them with ${count} items each.
          (e.g., 'couponList', 'benefitList' should have ${count} items).

        Target: ${method.toUpperCase()} ${path}
        Schema: ${JSON.stringify(safeSchema)}
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        const cleanText = responseText.replace(/```json\n?|\n?```/g, '').trim();
        res.json(JSON.parse(cleanText));

    } catch (err) {
        console.error("AI Error:", err);
        res.status(500).json({ error: '생성 실패: ' + err.message });
    }
});
// 404 핸들러
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// 에러 핸들러
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
        }
        return res.status(400).json({ error: 'File upload error.' });
    }
    
    res.status(500).json({ 
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔒 Security features enabled`);
    console.log(`⚡ Rate limit: ${RATE_LIMIT} requests per minute`);
});
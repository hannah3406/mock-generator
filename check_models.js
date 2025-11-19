// check_models.js
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // 임시 인스턴스
    // 모델 리스트 조회 기능은 SDK 버전에 따라 다를 수 있어, 직접 curl로 확인하는 게 가장 확실하긴 합니다만,
    // 일단 가장 쉬운 해결책인 '방법 1(업데이트)'부터 해보시길 권장합니다!
    console.log("라이브러리가 정상적으로 로드되었습니다.");
  } catch (e) {
    console.log(e);
  }
}
listModels();
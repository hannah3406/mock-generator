# 🛡️ Secure Mock Data Generator

![Node.js](https://img.shields.io/badge/Node.js-v18-green)
![Docker](https://img.shields.io/badge/Docker-Enabled-blue)
![AI](https://img.shields.io/badge/Powered%20by-Gemini%20Pro-orange)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

**OpenAPI/Swagger 명세서를 기반으로, 보안 걱정 없이 안전한 Mock 데이터를 생성해주는 AI 도구입니다.**

개발 단계에서 백엔드 API가 완성되지 않았을 때, 프론트엔드 개발자가 API 명세서만으로 리얼한 한국어 더미 데이터를 즉시 생성하여 개발 속도를 높일 수 있도록 돕습니다.

---

## 📖 목차
1. [프로젝트 소개](#-프로젝트-소개)
2. [주요 기능](#-주요-기능)
3. [보안 아키텍처 (Security)](#-보안-아키텍처-security)
4. [기술 스택](#-기술-스택)
5. [로컬 실행 방법](#-로컬-실행-방법)
6. [배포 방법 (Render.com)](#-배포-방법-rendercom)
7. [트러블슈팅](#-트러블슈팅)

---

## 💡 프로젝트 소개

### 배경
API 개발 환경에서는 백엔드와 프론트엔드의 개발 시점이 맞지 않는 경우가 많습니다. 기존의 Mock 데이터 생성 방식(Faker.js 등)은 수동 작업이 많고, 단순 랜덤 값이라 실제 비즈니스 맥락을 반영하지 못하는 단점이 있었습니다.

### 해결책
이 프로젝트는 **Google Gemini AI**를 활용하여 명세서의 문맥을 이해하고, **한국 실정에 맞는 리얼한 데이터**(예: '서울시 강남구...', '김민수' 등)를 생성합니다. 동시에 기업 보안을 위해 **민감 정보를 필터링**하는 전처리 엔진을 탑재했습니다.

> **Note:** 본 프로젝트는 기획부터 구현까지 **Generative AI (LLM)**를 적극 활용하여 개발 생산성을 극대화한 사례입니다.

---

## ✨ 주요 기능

* **📂 OpenAPI/Swagger 파싱:** JSON/YAML 형식의 명세서를 자동으로 분석하고 구조화합니다.
* **🤖 AI 기반 데이터 생성:** 단순 난수가 아닌, 스키마의 맥락을 이해한 고품질 데이터를 생성합니다.
* **🇰🇷 한국어 최적화:** 한국 이름, 주소, 전화번호 형식 등 로컬라이징된 데이터를 제공합니다.
* **🛡️ 강력한 보안 필터링:** 비즈니스 로직(Description)이나 예시(Example) 등 민감 정보를 제거 후 AI에 전송합니다.
* **🔢 데이터 개수 제어:** 배열(Array) 타입은 원하는 개수만큼, 객체(Object)는 구조에 맞게 1개만 생성하도록 제어합니다.
* **🐳 Docker 지원:** 어느 환경에서든 원클릭으로 실행 가능한 컨테이너 환경을 제공합니다.

---

## 🔒 보안 아키텍처 (Security)

이 서비스는 **Data Sanitization(데이터 세탁)** 과정을 거쳐 AI에게 데이터를 전송합니다.

1.  **사용자 업로드:** Swagger 파일 업로드
2.  **1차 파싱:** 파일 유효성 검사 및 JSON 변환
3.  **Sanitization (핵심):**
    * `description`, `example`, `title` 등 비즈니스 로직이 포함된 필드 **제거**
    * 오직 데이터 구조(Type)와 필드명(Key)만 추출
4.  **AI 요청:** 정제된 '껍데기' 스키마만 Google Gemini API로 전송
5.  **결과 반환:** 생성된 JSON 데이터 반환

---

## 🛠 기술 스택

| 분류 | 기술 |
| :--- | :--- |
| **Backend** | Node.js (Express), Multer, Swagger Parser |
| **AI Engine** | Google Generative AI SDK (Gemini 1.5 Flash) |
| **Frontend** | HTML5, CSS3, Vanilla JS (SPA 방식) |
| **Infra** | Docker, Docker Compose |
| **Deploy** | Render.com (Web Service) |

---

## 💻 로컬 실행 방법

### 사전 준비
* Docker Desktop 설치
* Google Gemini API Key 발급 ([Google AI Studio](https://aistudio.google.com/app/apikey))

### 1. 프로젝트 클론 및 설정
```bash
git clone <repository-url>
cd mock-generator

# .env 파일 생성 및 키 입력
echo "GEMINI_API_KEY=YOUR_API_KEY_HERE" > .env
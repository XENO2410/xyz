# 🚀 Digital Seva – AI-Powered Public Service Platform

## 🔍 Overview
Digital Seva is an AI-powered platform designed to **simplify access to government schemes and services**. It helps individuals discover, verify, and apply for **financial aid, scholarships, healthcare support, housing benefits,** and other government assistance. By leveraging AI and automation, we ensure **hassle-free and efficient public service delivery**.

## 🎯 Problem Statement
Millions of citizens struggle to find and apply for government schemes due to **complex eligibility criteria, lack of awareness, and documentation issues**. Our platform tackles these challenges by offering:

✅ **Personalized AI-driven scheme recommendations**  
✅ **Instant document verification**  
✅ **24/7 chatbot assistance (Nithya)**  
✅ **Seamless application process tracking**

## 💡 Solution
Digital Seva integrates AI and automation to provide:  

🔹 **AI-Powered Scheme Recommender** – Matches users with suitable government schemes based on **age, income, occupation, location, and category (minority, disability, etc.)**  
🔹 **Nithya – AI Chat Assistant** – Provides **multilingual 24/7 support** for scheme queries, eligibility checks, and application tracking  
🔹 **Smart Document Verification** – Uses **ML models** to validate identity and eligibility documents instantly  
🔹 **Intelligent Search & Voice Query** – Users can **type or speak** to search for relevant schemes  

## 🔥 Key Features
### 1️⃣ **User Authentication**
🔑 **Secure login & registration** using JWT authentication

### 2️⃣ **Profile-Based Recommendations**
🤖 AI-driven system analyzes user details to suggest **best-fit schemes**

### 3️⃣ **Scheme Finder**
🔍 Search & filter schemes by **eligibility, benefits, required documents, deadlines**

### 4️⃣ **Nithya – AI Chat Assistant**
💬 24/7 chatbot support for **scheme details, application guidance, and updates**

### 5️⃣ **Document Management & Verification**
📄 Upload, verify, and manage essential documents using ML models

## 🛠️ Tech Stack
| **Component**  | **Technology Used**  |
|---------------|-------------------|
| Frontend  | React.js, Next.js  |
| Backend  | Node.js, Express.js  |
| AI/ML Backend  | Flask, CodeGPT API  |
| Database  | MongoDB  |
| Authentication  | JWT  |

## 🏗️ Project Architecture
1️⃣ **Client Layer:** Web app (React.js) with chat UI & scheme finder  
2️⃣ **API Gateway:** Express.js handles requests between frontend & services  
3️⃣ **Microservices:** Authentication, Scheme Matching, Document Processing  
4️⃣ **AI Services:** ML-based document verification & NLP-driven chatbot  
5️⃣ **Data Layer:** MongoDB for user profiles & scheme details  

## 📂 Folder Structure
```
📦 Digital-Seva
 ┣ 📂 digital-seva
 ┃ ┣ 📜 app/components/AIAssistant.tsx
 ┃ ┣ 📜 app/components/SchemeFinder.tsx
 ┃ ┗ 📜 app/api/chat/route.ts
 ┣ 📂 digital-seva-backend
 ┃ ┣ 📜 routes/auth.js
 ┃ ┣ 📜 routes/documents.js
 ┃ ┗ 📜 models/User.js
 ┣ 📂 digital-seva-ml-backend
 ┃ ┣ 📜 app.py
 ┃ ┣ 📜 document_validators.py
 ┗ 📜 README.md
```

## 🚀 How to Run
### 1️⃣ **Clone the Repository**
```sh
git clone https://github.com/Evenidk/EY_Hackathon.git
```

### 2️⃣ **Install Dependencies**
```sh
# digital-seva
yarn install  # or npm install

# Backend
cd digital-seva-backend
npm install

# ML Backend
cd digital-seva-ml-backend
pip install -r requirements.txt
```

### 3️⃣ **Start the Services**
```sh
# Start frontend
yarn dev  # or npm run dev

# Start backend
cd digital-seva-backend
node index.js or npm run start

# Start ML backend
cd digital-seva-ml-backend
python app.py
```

## 📌 Future Enhancements
🔹 Mobile App Integration 📱  
🔹 Advanced Scheme Eligibility Prediction using AI 🧠  
🔹 Partnership with Government Portals 🤝  

## 📜 License
This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

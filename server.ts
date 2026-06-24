import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const GAS_URL = "https://script.google.com/macros/s/AKfycbxfxHVcZC1dumIipvWf4D5bJ443Cdndlj43gN-p0ZEf72NoQpDkhxWrppJDOkskl55y3Q/exec";

// 1. GET Schedules from Google Apps Script Web App
app.get("/api/schedules", async (req, res) => {
  try {
    const gasRes = await fetch(GAS_URL, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });

    if (!gasRes.ok) {
      throw new Error(`Google Apps Script returned status ${gasRes.status}`);
    }

    const data: any = await gasRes.json();
    if (data && data.success) {
      res.json({ success: true, events: data.events || [] });
    } else {
      res.status(500).json({ error: (data && data.error) || "Apps Script에서 일정을 가져오지 못했습니다." });
    }
  } catch (error: any) {
    console.error("Failed to fetch schedules from GAS:", error);
    res.status(500).json({ error: `구글 스프레드시트 일정 동기화 실패: ${error.message}` });
  }
});

// 2. POST (Sync) Schedules to Google Apps Script Web App
app.post("/api/schedules", async (req, res) => {
  try {
    const { events } = req.body;

    const gasRes = await fetch(GAS_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        action: "sync",
        events: events || []
      })
    });

    if (!gasRes.ok) {
      throw new Error(`Google Apps Script returned status ${gasRes.status}`);
    }

    const data: any = await gasRes.json();
    if (data && data.success) {
      res.json({ success: true, message: data.message });
    } else {
      res.status(500).json({ error: (data && data.error) || "Apps Script 동기화에 실패했습니다." });
    }
  } catch (error: any) {
    console.error("Failed to sync schedules to GAS:", error);
    res.status(500).json({ error: `구글 스프레드시트 일정 업로드 실패: ${error.message}` });
  }
});

// 3. AI Screenshot Image Analysis Endpoint
app.post("/api/analyze-screenshot", async (req, res) => {
  const { imageBase64, mimeType } = req.body;

  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ error: "이미지 데이터(imageBase64)와 mimeType이 누락되었습니다." });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY가 서버에 등록되어 있지 않습니다." });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });

    // Extracting Base64 purely (strip headers like data:image/png;base64, if sent)
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const promptText = `
      이 이미지는 사용자의 일정 정보가 담긴 스마트폰/캘린더 캡처 이미지 또는 일정이 텍스트로 표기된 스크린샷입니다.
      이미지 내에 적힌 모든 일정을 빠짐없이 완벽하게 인식해서 JSON 리스트 형태로 반환해주세요.

      다음 파싱 규칙을 엄격하게 지켜주세요:
      1. 연도는 2026년을 기준으로 매핑하세요. 이미지 속 날짜 표기에 연도가 생략되어 있어도 2026년으로 적용하세요. (예: 6.28 또는 6월 28일 -> 2026-06-28)
      2. 날짜 형식은 반드시 'YYYY-MM-DD' 형식이어야 합니다. (예: '2026-06-28')
      3. 시작시간(startTime)과 종료시간(endTime)은 24시간제 'HH:MM' 형식으로 추출하세요. (예: '오전 8:00' -> '08:00', '오후 3:00' -> '15:00', '오후 12:00' -> '12:00', '오전 11:00' -> '11:00')
      4. 만약 '하루 종일' 이라는 단어가 있거나 구체적인 시간이 명시되지 않았다면, startTime과 endTime을 null로 비워두고 description에 '하루 종일' 혹은 이미지 내에 매핑된 일정의 원본 시간 정보를 기록하세요.
      5. 일정이 여러 날에 걸쳐 있는 경우 (예: '7월4일~5일 서해민어도 가기?'), 시작 날짜(2026-07-04)와 시작/종료 시간을 파싱하되, 종료일이나 상세 내용을 description에 '7월 4일 ~ 7월 5일 서해민어도 가기?' 등 원본 텍스트 내용을 모두 기록해주세요.
      6. 제목(title)은 일정을 구분할 수 있도록 텍스트 그대로 가져오되, 불필요한 공백을 정돈하세요. (예: '딥스 1부늦입', '수원룸 3시', '저녁 종로 술병', '성남 2시')
    `;

    const MODELS_TO_TRY = [
      'gemini-3.5-flash',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
      'gemini-3.1-pro-preview'
    ];

    let response: any = null;
    let lastError: any = null;

    for (const modelName of MODELS_TO_TRY) {
      try {
        console.log(`Attempting image analysis with model: ${modelName}`);
        response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                  }
                },
                {
                  text: promptText
                }
              ]
            }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                events: {
                  type: Type.ARRAY,
                  description: "이미지로부터 파싱된 일정 목록",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING, description: "일정 제목" },
                      date: { type: Type.STRING, description: "일정 날짜 (YYYY-MM-DD 포맷)" },
                      startTime: { type: Type.STRING, description: "시작 시간 (HH:MM 포맷, 없는 경우 null)", nullable: true },
                      endTime: { type: Type.STRING, description: "종료 시간 (HH:MM 포맷, 없는 경우 null)", nullable: true },
                      description: { type: Type.STRING, description: "상세 내용 또는 메모", nullable: true }
                    },
                    required: ["title", "date"]
                  }
                }
              },
              required: ["events"]
            }
          }
        });

        if (response && response.text) {
          console.log(`Successfully parsed image using model: ${modelName}`);
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} failed or returned error:`, err.message || err);
        lastError = err;
        // Continue to fallback model
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("모든 AI 모델 호출에 실패했습니다.");
    }

    const parsedResult = JSON.parse(response.text || "{}");
    res.json(parsedResult);
  } catch (error: any) {
    console.error("Gemini Image Analysis Error:", error);
    res.status(500).json({ error: `이미지 분석 오류: ${error.message || error}` });
  }
});

// 4. Vite Dev Server Integrations / Static Production Assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer();

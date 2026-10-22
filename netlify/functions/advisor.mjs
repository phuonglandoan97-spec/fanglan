export default async (request) => {
  if (request.method !== "POST") {
    return Response.json(
      { error: "Chỉ hỗ trợ yêu cầu POST." },
      { status: 405 }
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "Netlify chưa tìm thấy OPENAI_API_KEY." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Dữ liệu gửi lên không hợp lệ." },
      { status: 400 }
    );
  }

  const topic = typeof body.topic === "string" ? body.topic.trim() : "";

  if (!topic || topic.length > 1200) {
    return Response.json(
      { error: "Hãy nhập chủ đề dài tối đa 1.200 ký tự." },
      { status: 400 }
    );
  }

  try {
    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        store: false,
        max_output_tokens: 700,
        instructions: `Bạn là AI Cố vấn nội dung của Fanglan. Kênh hướng đến người Việt học tiếng Trung để làm việc với kho xưởng, nhập hàng và người tìm hiểu du học Trung Quốc ngành thương mại điện tử.

Hãy trả lời bằng tiếng Việt, thực tế và dễ triển khai thành video TikTok 30–60 giây. Khi nhận một chủ đề:
1. Đánh giá mức độ phù hợp với khán giả và tuyến nội dung.
2. Đưa ra 3 góc khai thác độc lập, mỗi góc có câu mở đầu thu hút, giá trị chính và lời kêu gọi hành động.
3. Chọn góc nên làm trước và giải thích ngắn gọn.
4. Không bịa xu hướng, số liệu, thông tin tuyển sinh hoặc trải nghiệm. Nêu rõ điều gì cần kiểm chứng.
Lana là người duyệt cuối cùng.`,
        input: topic,
      }),
    });

    const result = await aiResponse.json();

    if (!aiResponse.ok) {
      console.error(`OpenAI request failed: ${aiResponse.status}`);
      return Response.json(
        { error: `Dịch vụ AI phản hồi lỗi ${aiResponse.status}.` },
        { status: 502 }
      );
    }

    const idea = (result.output || [])
      .flatMap((item) => item.content || [])
      .filter((part) => part.type === "output_text")
      .map((part) => part.text)
      .join("\n")
      .trim();

    if (!idea) {
      return Response.json(
        { error: "AI chưa tạo được nội dung. Hãy thử lại." },
        { status: 502 }
      );
    }

    return Response.json({ idea });
  } catch {
    console.error("Advisor function request failed.");
    return Response.json(
      { error: "Không kết nối được dịch vụ AI. Hãy thử lại." },
      { status: 502 }
    );
  }
};

export const config = {
  path: "/api/advisor",
  rateLimit: {
    windowSize: 60,
    windowLimit: 5,
    aggregateBy: ["ip"],
  },
};

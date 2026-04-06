"use client";

export default function QuizError({ error, reset }) {
  return (
    <main
      style={{
        minHeight: "60vh",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
        maxWidth: "560px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ color: "#1e3a5f" }}>Lỗi tải trang Quiz</h1>
      <p style={{ color: "#444" }}>{error?.message || "Đã xảy ra lỗi không xác định."}</p>
      <button
        type="button"
        onClick={() => reset()}
        style={{
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          cursor: "pointer",
          borderRadius: "8px",
          border: "1px solid #ccc",
        }}
      >
        Thử lại
      </button>
    </main>
  );
}

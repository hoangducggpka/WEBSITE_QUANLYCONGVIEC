import React, { useState } from "react";
import styles from "./Help.module.css";

const faqData = [
  {
    question: "Làm sao để tạo nhóm mới?",
    answer:
      "Bạn vào Dashboard, chọn 'Tạo nhóm', điền thông tin và nhấn xác nhận.",
  },
  {
    question: "Điểm uy tín được tính như thế nào?",
    answer:
      "Điểm uy tín được tính dựa trên mức độ hoàn thành công việc, đánh giá từ thành viên và lịch sử hoạt động.",
  },
  {
    question: "Tôi có thể chỉnh sửa thông tin cá nhân ở đâu?",
    answer:
      "Bạn vào trang Profile và nhấn 'Chỉnh sửa hồ sơ'.",
  },
  {
    question: "Làm sao để rời khỏi nhóm?",
    answer:
      "Vào trang nhóm, chọn mục thành viên và nhấn 'Rời nhóm'.",
  },
];

const Help = () => {
  const [activeIndex, setActiveIndex] = useState(null);
  const [feedback, setFeedback] = useState("");

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    alert("Cảm ơn bạn đã gửi phản hồi!");
    setFeedback("");
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h2 className={styles.title}>Trung tâm trợ giúp</h2>

        {/* FAQ Section */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Câu hỏi thường gặp</h3>

          <div className={styles.faqList}>
            {faqData.map((item, index) => (
              <div key={index} className={styles.faqItem}>
                <div
                  className={styles.question}
                  onClick={() => toggleFAQ(index)}
                >
                  {item.question}
                  <span>
                    {activeIndex === index ? "−" : "+"}
                  </span>
                </div>

                {activeIndex === index && (
                  <div className={styles.answer}>
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Feedback Section */}
        {/* <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Gửi phản hồi</h3>

          <form
            className={styles.feedbackForm}
            onSubmit={handleSubmit}
          >
            <textarea
              placeholder="Nhập ý kiến hoặc vấn đề bạn gặp phải..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <button type="submit">
              Gửi phản hồi
            </button>
          </form>
        </section> */}
      </div>
    </div>
  );
};

export default Help;

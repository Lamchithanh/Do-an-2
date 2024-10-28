const pool = require("../config/pool"); // Kết nối tới cơ sở dữ liệu

// Đăng ký khóa học
exports.enrollCourse = async (req, res) => {
  const { user_id, course_id } = req.body;

  console.log("user_id:", user_id, "course_id:", course_id); // Thêm log

  try {
    const result = await pool.query(
      "INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)",
      [user_id, course_id]
    );
    res
      .status(201)
      .json({ message: "Đăng ký thành công!", enrollmentId: result.insertId });
  } catch (error) {
    console.error(error); // In ra lỗi
    res.status(500).json({ error: "Lỗi khi đăng ký khóa học." });
  }
};

// Lấy danh sách khóa học đã đăng ký của người dùng
exports.getEnrollments = async (req, res) => {
  const { user_id } = req.params;

  try {
    const [enrollments] = await pool.query(
      "SELECT * FROM enrollments WHERE user_id = ?",
      [user_id]
    );
    res.json(enrollments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi khi lấy thông tin đăng ký." });
  }
};

// Đánh dấu khóa học là đã hoàn thành
exports.completeCourse = async (req, res) => {
  const { id } = req.params; // ID của bản ghi đăng ký

  try {
    const result = await pool.query(
      "UPDATE enrollments SET completed_at = CURRENT_TIMESTAMP WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Không tìm thấy bản ghi." });
    }

    res.json({ message: "Đánh dấu hoàn thành khóa học thành công!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi khi cập nhật trạng thái hoàn thành." });
  }
};

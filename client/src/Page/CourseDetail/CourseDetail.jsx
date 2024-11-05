import { useNavigate, useParams } from "react-router-dom";
import { Card, Col, Row, Typography, message, Collapse, Button } from "antd";
import { FaCheck } from "react-icons/fa";
import { fetchCourseById } from "../../../../server/src/Api/courseApi";
import { enrollCourseAPI } from "../../../../server/src/Api/enrollmentApi";
import { fetchLessonsAPI } from "../../../../server/src/Api/lessonApi";
import { fetchModulesAPI } from "../../../../server/src/Api/moduleApi";
import { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import defaultImage from "../../assets/img/sach.png";
import Loader from "../../context/Loader";
// import CourseReviews from "./CourseReviews ";
const { Title, Paragraph } = Typography;

const CourseDetail = () => {
  const { id: courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [totalLessons, setTotalLessons] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const checkEnrollmentStatus = () => {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) return false;

      const enrolledCoursesData =
        JSON.parse(localStorage.getItem("enrolledCourses")) || {};
      const userEnrolledCourses = enrolledCoursesData[user.id] || [];

      return userEnrolledCourses.includes(courseId);
    };

    setIsEnrolled(checkEnrollmentStatus());

    const fetchCourseData = async () => {
      try {
        setLoading(true);
        const data = await fetchCourseById(courseId);
        setCourse(data);

        const modulesData = await fetchModulesAPI(courseId);
        const allLessons = {};

        for (const module of modulesData) {
          const moduleLessons = await loadLessons(module.id);
          allLessons[module.id] = moduleLessons;
        }

        const updatedModulesWithOrder = updateLessonOrder(
          modulesData.map((module) => ({
            ...module,
            lessons: allLessons[module.id] || [],
          }))
        );

        setModules(updatedModulesWithOrder); // Cập nhật danh sách chương với thứ tự bài học
        setTotalLessons(
          updatedModulesWithOrder.reduce(
            (total, module) => total + module.lessons.length,
            0
          )
        ); // Tổng số bài học
      } catch (err) {
        console.error("[Debug] Error in fetchCourseData:", err);
        setError("Lỗi khi tải thông tin khóa học. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [courseId]);

  const handleEnroll = async () => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user || !user.id) {
      message.error("Bạn cần đăng nhập để đăng ký khóa học.");
      return;
    }

    try {
      const response = await enrollCourseAPI({ userId: user.id, courseId });

      // Cập nhật trạng thái isEnrolled mà không cần tải lại
      setIsEnrolled(true);

      // Lưu vào localStorage
      let enrolledCoursesData;
      try {
        enrolledCoursesData =
          JSON.parse(localStorage.getItem("enrolledCourses")) || {};
      } catch {
        enrolledCoursesData = {};
      }

      // Đảm bảo mảng khóa học của user tồn tại
      if (!Array.isArray(enrolledCoursesData[user.id])) {
        enrolledCoursesData[user.id] = [];
      }

      // Thêm khóa học mới nếu chưa tồn tại
      if (!enrolledCoursesData[user.id].includes(courseId)) {
        enrolledCoursesData[user.id].push(courseId);
        localStorage.setItem(
          "enrolledCourses",
          JSON.stringify(enrolledCoursesData)
        );
      }

      message.success(response.message || "Đăng ký khóa học thành công!");
    } catch (err) {
      console.error("[Debug] Error in handleEnroll:", err);
      message.error("Đăng ký khóa học thất bại. Vui lòng thử lại sau.");
    }
  };

  const loadLessons = async (moduleId) => {
    try {
      const lessonsData = await fetchLessonsAPI(moduleId);
      if (Array.isArray(lessonsData)) {
        setLessons((prevLessons) => ({
          ...prevLessons,
          [moduleId]: lessonsData,
        }));
        return lessonsData; // Trả về dữ liệu bài học của module
      } else {
        message.error(`Dữ liệu bài học không hợp lệ cho module ${moduleId}`);
        return [];
      }
    } catch (err) {
      console.error("[Debug] Error in fetchCourseData:", err);
      message.error(`Không thể tải bài học cho module ${moduleId}.`);
      return [];
    }
  };

  const getYoutubeEmbedUrl = (url) => {
    if (!url) return null;
    const match = url.match(
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    );
    return match && match[2].length === 11
      ? `https://www.youtube.com/embed/${match[2]}`
      : null;
  };

  const handleLessonClick = (lesson) => {
    if (isEnrolled) {
      setSelectedLesson(lesson);
    } else {
      toast.warning("Bạn cần đăng ký khóa học để xem video của bài học này.", {
        position: "top-center",
      });
    }
  };

  // Hàm cập nhật thứ tự bài học từ các chương và bài học hiện có
  const updateLessonOrder = (modules) => {
    let orderIndex = 1;
    return modules.map((module) => {
      const updatedLessons = module.lessons.map((lesson) => {
        return { ...lesson, order: orderIndex++ }; // Continuously increment across modules
      });
      return { ...module, lessons: updatedLessons };
    });
  };
  let lessonCounter = 1;

  const moduleItems = modules.map((module, index) => ({
    key: module.id.toString(),
    label: (
      <div className="module-header">
        <span>
          <strong>Chương {index + 1}: </strong>
          <strong style={{ color: "orange" }}>{module.title}</strong>
        </span>
        <span> </span>
        {lessons[module.id]?.length > 0 && (
          <span className="lesson-count">
            ({lessons[module.id].length} bài học)
          </span>
        )}
        {!isEnrolled && ( // Chỉ hiển thị ổ khóa khi chưa đăng ký
          <span
            role="img"
            aria-label="lock"
            style={{
              marginLeft: "8px",
              color: "red",
              fontSize: "16px",
            }}
          >
            🔒
          </span>
        )}
      </div>
    ),
    children: (
      <ul className="lesson-list">
        {lessons[module.id]?.map((lesson, index) => (
          <li
            key={lesson.id}
            className={`lesson-item ${
              selectedLesson?.id === lesson.id ? "active" : ""
            }`}
            onClick={() => handleLessonClick(lesson)}
            style={{
              cursor: "pointer",
              padding: "10px",
              backgroundColor:
                selectedLesson?.id === lesson.id ? "#f0f0f0" : "#d0ebf1",
              borderRadius: "4px",
              marginBottom: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              transition: "background-color 0.3s ease",
              boxShadow:
                selectedLesson?.id === lesson.id
                  ? "0 0 8px rgba(0, 123, 255, 0.3)"
                  : "none",
            }}
          >
            <span className="lesson-title">
              <strong>{`Bài ${lessonCounter++}: `}</strong>
              {lesson.title}
            </span>
            {lesson.duration && (
              <span className="lesson-duration">{lesson.duration}</span>
            )}
          </li>
        ))}
      </ul>
    ),
    onExpand: () => loadLessons(module.id),
  }));

  // Hàm chuyển đổi phút sang giờ, phút, giây
  const convertMinutesToHMS = (totalMinutes) => {
    const totalSeconds = totalMinutes * 60; // Chuyển đổi phút sang giây
    const hours = Math.floor(totalSeconds / 3600); // Tính số giờ
    const minutes = Math.floor((totalSeconds % 3600) / 60); // Tính số phút

    return `${hours}h ${minutes}p`;
  };

  // Tính tổng thời gian
  const totalDuration = modules.reduce((total, module) => {
    const moduleLessons = lessons[module.id] || [];
    const moduleDuration = moduleLessons.reduce((moduleTotal, lesson) => {
      return moduleTotal + (lesson.duration || 0);
    }, 0);
    return total + moduleDuration;
  }, 0);

  // Sử dụng hàm convert để hiển thị thời gian
  const formattedDuration = convertMinutesToHMS(totalDuration);

  if (loading) return <Loader />;
  if (error) return <p>{error}</p>;
  if (!course) return <p>Không tìm thấy khóa học.</p>;

  return (
    <div className="course-detail container">
      <Button
        className="btn-back"
        onClick={() => navigate(-1)}
        style={{ marginBottom: 16 }}
      >
        Quay lại
      </Button>

      <Row gutter={16}>
        <Col span={18}>
          <Card
            title={course.title}
            style={{ marginBottom: "20px", borderRadius: "8px" }}
          >
            <div className="video-section" style={{ marginBottom: "20px" }}>
              {selectedLesson ? (
                isEnrolled ? (
                  <>
                    <Title level={4}>{selectedLesson.title}</Title>
                    <div
                      style={{
                        position: "relative",
                        paddingBottom: "56.25%",
                        height: 0,
                        overflow: "hidden",
                      }}
                    >
                      <iframe
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          border: "none",
                        }}
                        src={getYoutubeEmbedUrl(selectedLesson.video_url)}
                        allowFullScreen
                        title={selectedLesson.title}
                      />
                    </div>
                    <Paragraph style={{ marginTop: "16px" }}>
                      {selectedLesson.description ||
                        "Chưa có mô tả cho bài học này."}
                    </Paragraph>
                  </>
                ) : (
                  <p>Bạn cần đăng ký khóa học để xem video của bài học này.</p>
                )
              ) : course.intro_video_url ? (
                <>
                  <Title level={4}>Giới thiệu khóa học</Title>
                  <div
                    style={{
                      position: "relative",
                      paddingBottom: "56.25%",
                      height: 0,
                      overflow: "hidden",
                    }}
                  >
                    <iframe
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        border: "none",
                      }}
                      src={getYoutubeEmbedUrl(course.intro_video_url)}
                      allowFullScreen
                      title="Giới thiệu khóa học"
                    />
                  </div>
                </>
              ) : (
                <img
                  alt={course.title}
                  src={course.image || defaultImage}
                  style={{
                    width: "300px",
                    height: "auto",
                    borderRadius: "8px",
                  }}
                />
              )}
            </div>
            <Title level={4}>Nội dung khóa học</Title>
            <Collapse items={moduleItems} />
          </Card>{" "}
          {/* <Title level={4}>Đánh giá khóa học</Title>
          <CourseReviews courseId={courseId} isEnrolled={isEnrolled} /> */}
        </Col>

        <Col span={6}>
          <Card title="Thông tin khóa học">
            <p>
              <strong>Giá:</strong> {course.price} VND
            </p>
            {/* <p>
              <strong>Giảng viên:</strong> {course.instructor_name}
            </p> */}
            <p>
              <strong>Thời gian tổng:</strong> {formattedDuration}
            </p>
            <p>
              <strong>Số bài học:</strong> {totalLessons} bài
            </p>
            <p>
              <strong>Mô tả:</strong> {course.description}
            </p>
            {!isEnrolled && (
              <Button
                style={{ backgroundColor: "#4caf50", borderColor: "#4caf50" }}
                type="primary"
                onClick={handleEnroll}
              >
                Đăng ký khóa học
              </Button>
            )}
            {isEnrolled && (
              <h6>
                Đã đăng ký
                <span style={{ marginLeft: 10 }}>
                  <FaCheck />
                </span>
              </h6>
            )}
          </Card>
        </Col>
      </Row>

      <ToastContainer />
    </div>
  );
};

export default CourseDetail;

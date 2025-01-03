import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  Col,
  Row,
  Typography,
  message,
  Collapse,
  Button,
  Modal,
} from "antd";
import { FaCheck } from "react-icons/fa";
import {
  fetchCourseById,
  getProgressAPI,
  updateProgressAPI,
} from "../../../../server/src/Api/courseApi";
import {
  enrollCourseAPI,
  getEnrollmentStatusAPI,
} from "../../../../server/src/Api/enrollmentApi";
import {
  fetchLessonsAPI,
  getCourseDurationAPI,
  getModuleDurationAPI,
} from "../../../../server/src/Api/lessonApi";
import { fetchModulesAPI } from "../../../../server/src/Api/moduleApi";
import { useCallback, useEffect, useState } from "react";
import {
  CheckOutlined,
  // LeftCircleOutlined,
  LeftOutlined,
} from "@ant-design/icons";
import "react-toastify/dist/ReactToastify.css";
import CourseReviews from "./CourseReviews ";
import defaultImage from "../../assets/img/sach.png";
import Loader from "../../context/Loader";
import CourseProgress from "./CourseProgress";
import VideoProgressTracker from "./VideoProgressTracker";
import "./CourseDetail.scss";
import { checkPaymentStatusAPI } from "../../../../server/src/Api/paymentApi";
import axios from "axios";
import { API_URL } from "../../../../server/src/config/config";

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
  const [watchedLessons, setWatchedLessons] = useState([]);
  const [totalCourseDuration, setTotalCourseDuration] = useState(0);
  const [setModuleDurations] = useState({});
  const [availableLessons, setAvailableLessons] = useState([]);
  const [newLessons, setNewLessons] = useState([]);
  const [isLockedModalVisible, setIsLockedModalVisible] = useState(false);
  const [isNewLessonModalVisible, setIsNewLessonModalVisible] = useState(false);
  const [selectedLockedLesson, setSelectedLockedLesson] = useState(null);
  const [newLessonDetails, setNewLessonDetails] = useState(null);
  const [shownNewLessons, setShownNewLessons] = useState([]);
  const [progress, setProgress] = useState(0);
  const [progressUpdateTrigger, setProgressUpdateTrigger] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  useEffect(() => {
    const checkEnrollmentStatus = async () => {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) return;

      try {
        const enrolledCoursesData =
          JSON.parse(localStorage.getItem("enrolledCourses")) || {};
        const userEnrolledCourses = enrolledCoursesData[user.id] || [];

        if (userEnrolledCourses.includes(courseId)) {
          setIsEnrolled(true);
          return;
        }

        const status = await getEnrollmentStatusAPI(user.id, courseId);
        setIsEnrolled(
          status === "enrolled" || status === true || status === "active"
        );
      } catch (error) {
        console.error("Error checking enrollment status:", error);
      }
    };

    const fetchCourseData = async () => {
      try {
        setLoading(true);
        const [data, modulesData] = await Promise.all([
          fetchCourseById(courseId),
          fetchModulesAPI(courseId),
        ]);
        setCourse(data);

        const allLessonsPromises = modulesData.map((module) =>
          loadLessons(module.id)
        );
        const allLessons = await Promise.all(allLessonsPromises);

        const updatedModulesWithOrder = updateLessonOrder(
          modulesData.map((module, index) => ({
            ...module,
            lessons: allLessons[index] || [],
          }))
        );

        setModules(updatedModulesWithOrder);
        await fetchModuleDurations(modulesData.map((module) => module.id));
        await fetchCourseDuration();
        setTotalLessons(
          updatedModulesWithOrder.reduce(
            (total, module) => total + module.lessons.length,
            0
          )
        );
      } catch (err) {
        console.error("[Debug] Error in fetchCourseData:", err);
        setError("Lỗi khi tải thông tin khóa học. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    // Chạy đồng thời
    const runEffect = async () => {
      await checkEnrollmentStatus();
      await fetchCourseData();
    };

    runEffect();
  }, [courseId]);

  useEffect(() => {
    const fetchWatchedLessons = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (user && courseId) {
          const progress = await getProgressAPI(user.id, courseId);
          if (Array.isArray(progress)) {
            setWatchedLessons(
              progress.filter((p) => p.watched).map((p) => p.lessonId)
            );
          }
        }
      } catch (error) {
        console.error("Error fetching watched lessons:", error);
      }
    };

    fetchWatchedLessons();
  }, [courseId]);

  const calculateAvailableLessons = () => {
    if (!Array.isArray(modules) || !modules.length) {
      setAvailableLessons([]);
      setNewLessons([]);
      return;
    }

    if (!Array.isArray(watchedLessons)) {
      console.error("watchedLessons is not a valid array:", watchedLessons);
      setAvailableLessons([]);
      setNewLessons([]);
      return;
    }

    let available = [];
    let newOnes = [];
    let lastWatchedOrder = 0;

    modules.forEach((module) => {
      module.lessons.forEach((lesson) => {
        if (watchedLessons.includes(lesson.id)) {
          lastWatchedOrder = Math.max(lastWatchedOrder, lesson.order);
        }

        if (lesson.order === 1 || lesson.order <= lastWatchedOrder + 1) {
          available.push(lesson.id);
          if (
            lesson.order <= lastWatchedOrder &&
            !watchedLessons.includes(lesson.id)
          ) {
            newOnes.push(lesson.id);
          }
        }
      });
    });

    setAvailableLessons(available);
    setNewLessons(newOnes);
  };
  useEffect(() => {
    // Gọi hàm calculateAvailableLessons khi modules hoặc watchedLessons thay đổi
    calculateAvailableLessons();
  }, [modules, watchedLessons]);

  const handleVideoProgress = async (lessonId, progress) => {
    if (progress >= 90) {
      const user = JSON.parse(localStorage.getItem("user"));
      if (user) {
        try {
          const response = await updateProgressAPI({
            userId: user.id,
            lessonId: lessonId,
            watched: true,
            progress: progress,
          });

          if (response.success) {
            // Cập nhật watchedLessons
            setWatchedLessons((prev) => {
              if (!prev.includes(lessonId)) {
                return [...prev, lessonId];
              }
              return prev;
            });

            // Mở khóa bài học tiếp theo
            const nextLesson = findNextLesson(lessonId);
            if (nextLesson) {
              setAvailableLessons((prevAvailable) => [
                ...prevAvailable,
                nextLesson.id,
              ]);

              // Tự động chọn bài học tiếp theo
              setSelectedLesson(nextLesson);
            }

            message.success("Tiến độ đã được cập nhật!");
          }
        } catch (error) {
          console.error("Error updating progress:", error);
          message.error("Không thể cập nhật tiến độ");
        }
      }
    }
  };

  useEffect(() => {
    const calculateAvailableLessons = () => {
      if (!Array.isArray(modules) || !modules.length) {
        setAvailableLessons([]);
        setNewLessons([]);
        return;
      }

      if (!Array.isArray(watchedLessons)) {
        console.error("watchedLessons is not a valid array:", watchedLessons);
        setAvailableLessons([]);
        setNewLessons([]);
        return;
      }

      let available = [];
      let newOnes = [];
      let lastWatchedOrder = 0;

      modules.forEach((module) => {
        module.lessons.forEach((lesson) => {
          // Xác định bài học đã xem có thứ tự cao nhất
          if (watchedLessons.includes(lesson.id)) {
            lastWatchedOrder = Math.max(lastWatchedOrder, lesson.order);
          }

          // Xác định bài học khả dụng và mới
          if (lesson.order === 1 || lesson.order <= lastWatchedOrder + 1) {
            available.push(lesson.id);
            if (
              lesson.order <= lastWatchedOrder &&
              !watchedLessons.includes(lesson.id)
            ) {
              newOnes.push(lesson.id);
            }
          }
        });
      });

      setAvailableLessons(available);
      setNewLessons(newOnes);
    };

    calculateAvailableLessons();
  }, [modules, watchedLessons]);

  useEffect(() => {
    const checkNewLessons = () => {
      // Only process new lessons that haven't been shown before
      const unshownNewLessons = newLessons.filter(
        (lessonId) => !shownNewLessons.includes(lessonId)
      );

      if (unshownNewLessons.length > 0) {
        let newLessonInfo = null;

        // Find the first unshown new lesson
        for (const module of modules) {
          for (const lesson of module.lessons) {
            if (unshownNewLessons.includes(lesson.id)) {
              newLessonInfo = {
                lesson: lesson,
                module: module,
                previousLesson: findPreviousLesson(lesson.order),
              };
              break;
            }
          }
          if (newLessonInfo) break;
        }

        if (newLessonInfo) {
          setNewLessonDetails(newLessonInfo);
          setIsNewLessonModalVisible(true);

          // Mark this lesson as shown
          setShownNewLessons((prev) => [...prev, newLessonInfo.lesson.id]);
        }
      }
    };

    checkNewLessons();
  }, [newLessons, modules]);

  const findPreviousLesson = (currentOrder) => {
    let previousLesson = null;
    modules.forEach((module) => {
      module.lessons.forEach((lesson) => {
        if (lesson.order === currentOrder - 1) {
          previousLesson = {
            lesson: lesson,
            module: module,
          };
        }
      });
    });
    return previousLesson;
  };

  // Hàm lấy thời lượng của từng module
  const fetchModuleDurations = async (moduleIds) => {
    try {
      const durations = {};
      for (const moduleId of moduleIds) {
        const duration = await getModuleDurationAPI(moduleId);
        durations[moduleId] = duration;
      }
      setModuleDurations(durations);
    } catch (error) {
      console.error("Error fetching module durations:", error);
    }
  };

  // Hàm lấy tổng thời lượng khóa học
  const fetchCourseDuration = async () => {
    try {
      const duration = await getCourseDurationAPI(courseId);
      setTotalCourseDuration(duration);
    } catch (error) {
      console.error("Error fetching course duration:", error);
    }
  };

  const checkEnrollmentStatus = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.id) {
      return "not_enrolled";
    }

    try {
      const response = await axios.get(
        `${API_URL}/enrollment-status/${user.id}/${courseId}`
      );
      return response.data; // Will return "not_enrolled", "enrolled", "completed", or "dropped"
    } catch (error) {
      console.error("Error checking enrollment status:", error);
      return "not_enrolled";
    }
  };

  const handleEnroll = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.id) {
      message.error("Bạn cần đăng nhập để đăng ký khóa học.");
      return;
    }

    try {
      // First, check the current enrollment status
      const currentStatus = await checkEnrollmentStatus();

      // If already enrolled or completed, show appropriate message
      if (currentStatus === "enrolled") {
        message.info("Bạn đã đăng ký khóa học này.");
        setIsEnrolled(true);
        return;
      }

      if (currentStatus === "completed") {
        message.info("Bạn đã hoàn thành khóa học này.");
        setIsEnrolled(true);
        return;
      }

      // Proceed with enrollment if not already enrolled
      const response = await enrollCourseAPI({
        userId: user.id,
        courseId,
      });

      if (
        response &&
        (response.success || response.message === "Đăng ký thành công!")
      ) {
        setIsEnrolled(true);

        // Update local storage for enrolled courses
        let enrolledCoursesData =
          JSON.parse(localStorage.getItem("enrolledCourses")) || {};
        enrolledCoursesData[user.id] = enrolledCoursesData[user.id] || [];

        if (!enrolledCoursesData[user.id].includes(courseId)) {
          enrolledCoursesData[user.id].push(courseId);
          localStorage.setItem(
            "enrolledCourses",
            JSON.stringify(enrolledCoursesData)
          );
        }

        message.success(response.message || "Đăng ký khóa học thành công!");
      } else {
        message.error(
          response?.message || "Đăng ký khóa học thất bại. Vui lòng thử lại."
        );
      }
    } catch (error) {
      console.error("Enrollment error:", error);
      message.error("Có lỗi xảy ra trong quá trình đăng ký.");
    }
  };

  useEffect(() => {
    const verifyEnrollmentStatus = async () => {
      const status = await checkEnrollmentStatus();
      setIsEnrolled(["enrolled", "completed"].includes(status));
    };

    verifyEnrollmentStatus();
  }, [courseId]);

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

  const handleLessonClick = async (lesson) => {
    if (isEnrolled) {
      // Kiểm tra xem bài học có khả dụng không
      if (!availableLessons.includes(lesson.id)) {
        // Tìm thông tin về module chứa bài học và bài học trước đó
        let lessonInfo = null;
        modules.forEach((module) => {
          if (module.lessons.includes(lesson)) {
            lessonInfo = {
              lesson: lesson,
              module: module,
              previousLesson: findPreviousLesson(lesson.order),
            };
          }
        });

        setSelectedLockedLesson(lessonInfo);
        setIsLockedModalVisible(true);
        return;
      }

      setSelectedLesson(lesson);
      const user = JSON.parse(localStorage.getItem("user"));
      if (user) {
        try {
          // Không tự động đánh dấu là đã xem nữa - việc này sẽ được thực hiện trong VideoProgressTracker
          // khi người dùng xem đủ 90% thời lượng
          await updateProgressAPI({
            userId: user.id,
            lessonId: lesson.id,
            watched: false, // Mặc định là false khi mới click vào bài học
            progress: progress, // Thêm trường progress để theo dõi
          });
        } catch (error) {
          console.error("Error updating progress:", error);
        }
      }
    } else {
      message.warning("Bạn cần đăng ký khóa học để xem video của bài học này.");
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

  const formatDuration = (duration) => {
    if (!duration) return "";

    // Nếu duration là số (float - đơn vị phút), chuyển đổi sang giây
    if (typeof duration === "number") {
      const totalSeconds = Math.round(duration * 60); // Chuyển phút sang giây
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }

    // Nếu duration là string
    if (typeof duration === "string") {
      const numericDuration = parseFloat(duration);
      if (!isNaN(numericDuration)) {
        const totalSeconds = Math.round(numericDuration * 60);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      }
      return duration;
    }

    return duration.toString();
  };

  const moduleItems = modules.map((module, index) => ({
    key: module.id.toString(),
    label: (
      <div className="module-header">
        <span>
          <strong>Chương {index + 1}: </strong>
          <strong style={{ color: "#f05a28" }}>{module.title}</strong>
        </span>
        <span> </span>
        {lessons[module.id]?.length > 0 && (
          <span className="lesson-count">
            ({lessons[module.id].length} bài học)
          </span>
        )}
        {!isEnrolled && (
          <span
            role="img"
            aria-label="lock"
            style={{
              // marginLeft: "8px",
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
        {lessons[module.id] && lessons[module.id].length > 0 ? (
          lessons[module.id].map((lesson) => (
            <li
              key={lesson.id}
              className={`lesson-item ${
                selectedLesson?.id === lesson.id ? "active" : ""
              }`}
              onClick={() => handleLessonClick(lesson)}
              style={{
                cursor: availableLessons.includes(lesson.id)
                  ? "pointer"
                  : "not-allowed",
                padding: "10px",
                backgroundColor: (() => {
                  if (selectedLesson?.id === lesson.id) return "#f0f0f0";
                  if (newLessons.includes(lesson.id)) return "#fffbe6"; // Màu vàng nhạt cho bài học mới
                  if (!availableLessons.includes(lesson.id)) return "#f5f5f5"; // Màu xám nhạt cho bài học chưa khả dụng
                  return "#d0ebf1";
                })(),
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
                opacity: availableLessons.includes(lesson.id) ? 1 : 0.7,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", flexGrow: 1 }}
              >
                <span className="lesson-title">
                  <strong>{`Bài ${lessonCounter++}: `}</strong>
                  {lesson.title}
                </span>
                {watchedLessons.includes(lesson.id) && (
                  <CheckOutlined
                    style={{
                      color: "#52c41a",
                      marginLeft: "8px",
                      fontSize: "16px",
                    }}
                  />
                )}
                {newLessons.includes(lesson.id) && (
                  <span
                    style={{
                      backgroundColor: "#faad14",
                      color: "white",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontSize: "12px",
                      marginLeft: "8px",
                    }}
                  >
                    Mới
                  </span>
                )}
              </div>
              {lesson.duration && (
                <span
                  className="lesson-duration"
                  style={{
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "#666",
                    fontFamily: "monospace",
                    minWidth: "60px",
                    textAlign: "center",
                    marginLeft: "8px",
                  }}
                >
                  {formatDuration(lesson.duration)}
                </span>
              )}
            </li>
          ))
        ) : (
          <li
            className="no-lesson-message"
            style={{
              padding: "10px",
              backgroundColor: "#ffd3d3",
              borderRadius: "4px",
              textAlign: "center",
              color: "#b22222",
              fontStyle: "italic",
              boxShadow: "0 0 8px rgba(178, 34, 34, 0.3)",
            }}
          >
            Bài học chưa có
          </li>
        )}
      </ul>
    ),
  }));

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const CourseInfoCard = () => (
    <Card
      style={{
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        ...(isMobile
          ? { marginBottom: "16px" }
          : { position: "sticky", top: "20px" }),
      }}
      title="Thông tin khóa học"
    >
      {!isEnrolled && (
        <div style={{ marginBottom: 10 }} className="course-price">
          <strong>
            Giá:{" "}
            <span style={{ color: "#f05a28" }}>
              {course.price === "0" || course.price === "0.00"
                ? "Miễn phí"
                : `${new Intl.NumberFormat("vi-VN").format(course.price)} VND`}
            </span>
          </strong>
        </div>
      )}

      {isEnrolled && (
        <CourseProgress
          modules={modules}
          lessons={lessons}
          userId={JSON.parse(localStorage.getItem("user"))?.id}
          courseId={courseId}
          onRequestCertificate={handleRequestCertificate}
        />
      )}

      <p style={{ marginTop: 10 }}>
        <strong>Thời gian tổng: </strong>
        <span
          className="course-detail-min"
          style={{ color: "#a7aeae", fontFamily: "monospace", fontSize: 15 }}
        >
          {convertMinutesToHMS(totalCourseDuration)}
        </span>
      </p>
      <p>
        <strong>Số bài học:</strong>{" "}
        <span className="course-detail-min" style={{ color: "#a7aeae" }}>
          {totalLessons} Bài
        </span>
      </p>
      <p>
        <strong>Mô tả:</strong>{" "}
        <span className="course-detail-min" style={{ color: "#a7aeae" }}>
          {course.description}
        </span>
      </p>

      {!isEnrolled && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          {course.price === "0" || course.price === "0.00" ? (
            <Button
              style={{
                backgroundColor: "#E7005E",
                color: "#F4F7FA",
                fontWeight: 600,
                borderRadius: 8,
                width: isMobile ? "100%" : "auto",
              }}
              onClick={handleEnroll}
            >
              Đăng ký khóa học
            </Button>
          ) : hasPaid ? (
            <Button
              style={{
                // backgroundColor: "#4caf50",
                borderColor: "#4caf50",
                width: isMobile ? "100%" : "auto",
              }}
              onClick={handleEnroll}
              className="btn_coursesdetail"
            >
              Đăng ký khóa học
            </Button>
          ) : (
            <Button
              onClick={() => navigate(`/payment/${courseId}`)}
              style={{
                backgroundColor: "#242145",
                borderColor: "#8491C2",
                color: "#f05a28",
                fontWeight: 700,
                width: isMobile ? "100%" : "auto",
              }}
            >
              Thanh toán
            </Button>
          )}
        </div>
      )}
      {isEnrolled && (
        <h6 style={{ color: "#f05a28", textAlign: "center", margin: 0 }}>
          <span>
            Đã đăng ký
            <span style={{ marginLeft: 5 }}>
              <FaCheck />
            </span>
          </span>
        </h6>
      )}
    </Card>
  );

  // Hàm chuyển đổi phút sang giờ, phút, giây
  const convertMinutesToHMS = (totalMinutes) => {
    if (!totalMinutes) return "0h 0p";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    return `${hours}h${minutes}P`;
  };

  const checkPaymentStatus = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return false;

    try {
      const { hasPaid } = await checkPaymentStatusAPI(user.id, courseId);
      return hasPaid;
    } catch (error) {
      console.error("Error checking payment status:", error);
      message.error("Không thể kiểm tra trạng thái thanh toán");
      return false;
    }
  };

  useEffect(() => {
    const fetchPaymentStatus = async () => {
      const status = await checkPaymentStatus();
      setHasPaid(status);
    };

    fetchPaymentStatus();
  }, [courseId]);

  const handleRequestCertificate = (userId, courseId) => {
    // Logic xử lý yêu cầu chứng chỉ, ví dụ: gọi API
    console.log("Yêu cầu chứng chỉ cho user:", userId, "khóa học:", courseId);
  };

  const findNextLesson = (currentLessonId) => {
    const allLessons = modules.flatMap((module) => module.lessons);
    const currentIndex = allLessons.findIndex(
      (lesson) => lesson.id === currentLessonId
    );
    return currentIndex !== -1 && currentIndex < allLessons.length - 1
      ? allLessons[currentIndex + 1]
      : null;
  };

  // Add this state
  const [hasPaid, setHasPaid] = useState(false);

  const getYoutubeEmbedUrl = (url) => {
    if (!url) return null;
    const match = url.match(
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    );
    return match && match[2].length === 11
      ? `https://www.youtube.com/embed/${match[2]}`
      : null;
  };

  const getLessonNumberAndTitle = (currentLesson) => {
    if (!currentLesson || !modules) return { number: 0, fullTitle: "" };

    let lessonNumber = 1; // Start from 1
    let found = false;

    for (const module of modules) {
      for (const lesson of module.lessons) {
        if (lesson.id === currentLesson.id) {
          found = true;
          return {
            number: lessonNumber,
            fullTitle: `Bài ${lessonNumber}: ${currentLesson.title}`,
          };
        }
        lessonNumber++;
      }
    }

    return {
      number: 0,
      fullTitle: currentLesson.title,
    };
  };

  if (loading) return <Loader />;
  if (error) return <p>{error}</p>;
  if (!course)
    return (
      <p
        style={{
          alignItems: "center",
          textAlign: "center",
        }}
      >
        Không tìm thấy khóa học.
      </p>
    );

  return (
    <div className="course-detail container">
      <Button
        className="btn-back"
        onClick={handleGoBack}
        style={{ margin: 10 }}
      >
        <LeftOutlined />
      </Button>

      <Row className="coursesdetail_content" gutter={[16, 16]} justify="center">
        <Col
          xs={24}
          sm={24}
          md={18}
          style={{
            padding: isMobile ? "0 8px" : "0 16px",
          }}
        >
          <Card
            className="courses_detailcard"
            title={course.title}
            style={{
              marginBottom: "20px",
              borderRadius: "8px",
              ...(isMobile
                ? {
                    margin: "0",
                    width: "100vw",
                    borderRadius: "0",
                    paddingRight: "10px",
                    boxShadow: "none",
                  }
                : {
                    margin: "10px",
                    maxWidth: "100%",
                  }),
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ borderRadius: 8 }} className="video-section">
              {selectedLesson ? (
                isEnrolled ? (
                  <>
                    <VideoProgressTracker
                      lessonId={selectedLesson.id}
                      videoUrl={selectedLesson.video_url}
                      modules={modules}
                      onProgressUpdate={handleVideoProgress}
                      onLessonComplete={(lessonId) => {
                        console.log("Lesson completed:", lessonId); // Thêm log để debug
                        setWatchedLessons((prev) => {
                          const updated = prev.includes(lessonId)
                            ? prev
                            : [...prev, lessonId];
                          console.log("Updated watched lessons:", updated); // Thêm log để debug
                          return updated;
                        });
                      }}
                      unlockNextLesson={(lessonId) => {
                        const nextLesson = findNextLesson(lessonId);
                        if (nextLesson) {
                          setAvailableLessons((prev) => [
                            ...prev,
                            nextLesson.id,
                          ]);
                        }
                      }}
                      resetNotification={false}
                    />
                    <Title
                      level={4}
                      style={{ fontSize: 25, marginTop: 20, marginLeft: 10 }}
                    >
                      {getLessonNumberAndTitle(selectedLesson).fullTitle}
                    </Title>

                    <Paragraph
                      style={{
                        marginTop: "16px",
                        marginLeft: 10,
                        fontWeight: 600,
                        color: "#666",
                      }}
                    >
                      <span>
                        {selectedLesson.description ||
                          "Chưa có mô tả cho bài học này."}
                      </span>
                    </Paragraph>
                  </>
                ) : (
                  <p>Bạn cần đăng ký khóa học để xem video của bài học này.</p>
                )
              ) : course.intro_video_url ? (
                <>
                  <Title style={{ margin: "10px 20px" }} level={4}>
                    Giới thiệu khóa học
                  </Title>
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
                        borderRadius: "8px",
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
                    width: "100%",
                    maxWidth: "800px",
                    height: "500px",
                    borderRadius: "8px",
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                    display: "block",
                    margin: "20px auto",
                  }}
                />
              )}
            </div>

            <Title level={4} style={{ margin: "30px 20px" }}>
              Nội dung khóa học
            </Title>
            <Collapse items={moduleItems} />
          </Card>{" "}
          {isMobile && (
            <div
              style={{
                width: "100%",
                padding: "0 8px",
                margin: "10px auto",
              }}
            >
              <CourseInfoCard />
            </div>
          )}
          <Title style={{ margin: "20px 40px", color: "#e6356f" }} level={4}>
            Đánh giá khóa học
          </Title>
          <CourseReviews courseId={courseId} isEnrolled={isEnrolled} />
        </Col>
        {!isMobile && (
          <Col md={6}>
            <CourseInfoCard />
          </Col>
        )}
      </Row>
      <>
        <Modal
          title="Bạn chưa hoàn thành bài học trước!"
          open={isLockedModalVisible}
          onCancel={() => setIsLockedModalVisible(false)}
          footer={[
            <button
              className="btn_modal"
              key="back"
              onClick={() => setIsLockedModalVisible(false)}
            >
              Đã hiểu
            </button>,
            selectedLockedLesson?.previousLesson && (
              <Button
                key="watch-previous"
                type="primary"
                onClick={() => {
                  setIsLockedModalVisible(false);
                  handleLessonClick(selectedLockedLesson.previousLesson.lesson);
                }}
              >
                Xem bài học trước
              </Button>
            ),
          ]}
        >
          {selectedLockedLesson && (
            <div>
              <p>
                <strong>Bài học:</strong> {selectedLockedLesson.lesson.title}
              </p>
              <p>
                <strong>Thuộc chương:</strong>{" "}
                {selectedLockedLesson.module.title}
              </p>
              {selectedLockedLesson.previousLesson ? (
                <>
                  <p>Để xem bài học này, bạn cần hoàn thành bài học trước:</p>
                  <p style={{ color: "#1890ff" }}>
                    {selectedLockedLesson.previousLesson.lesson.title}
                  </p>
                </>
              ) : (
                <p>Đây là bài học đầu tiên của chương trình.</p>
              )}
            </div>
          )}
        </Modal>

        {/* <Modal
          title="Bài học mới được thêm vào"
          open={isNewLessonModalVisible}
          onCancel={() => setIsNewLessonModalVisible(false)}
          footer={[
            <Button
              key="back"
              onClick={() => setIsNewLessonModalVisible(false)}
            >
              Để sau
            </Button>,
            <Button
              key="watch-now"
              type="primary"
              onClick={() => {
                setIsNewLessonModalVisible(false);
                if (newLessonDetails) {
                  handleLessonClick(newLessonDetails.lesson);
                }
              }}
            >
              Xem ngay
            </Button>,
          ]}
        >
          {newLessonDetails && (
            <div>
              <p>
                <strong>Bài học mới:</strong> {newLessonDetails.lesson.title}
              </p>
              <p>
                <strong>Thuộc chương:</strong> {newLessonDetails.module.title}
              </p>
              <p>
                Bài học này đã được thêm vào khóa học. Bạn nên xem để đảm bảo
                không bỏ lỡ kiến thức quan trọng.
              </p>
              {newLessonDetails.previousLesson && (
                <p>
                  <strong>Được thêm vào sau bài:</strong>{" "}
                  {newLessonDetails.previousLesson.lesson.title}
                </p>
              )}
            </div>
          )}
        </Modal> */}
        {/* <RandomCoupon /> */}
      </>
    </div>
  );
};

export default CourseDetail;

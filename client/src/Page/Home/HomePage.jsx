import { useState, useEffect } from "react";
import {
  Layout,
  Menu,
  Breadcrumb,
  message,
  Pagination,
  Badge,
  Drawer,
  List,
  theme,
  Tag,
} from "antd";

import {
  LaptopOutlined,
  NotificationOutlined,
  TrophyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import "./HomePage.scss";
import Loader from "../../context/Loader";
import { fetchCoursesAPI } from "../../../../server/src/Api/courseApi";
import defaultImage from "../../assets/img/sach.png";

import "react-toastify/dist/ReactToastify.css";
// import HeroSection from "./HeroSection/HeroSection";
import FeaturedCourses from "./FeaturedCourses/FeaturedCourses";
import Testimonials from "./Testimonials/Testimonials";
import LatestBlog from "./LatestBlog/LatestBlog";
import CourseCard from "../../components/Card/Card";

const { Header, Content } = Layout;

const HomePage = () => {
  const [courses, setCourses] = useState([]);
  const [newlyAddedCourses, setNewlyAddedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [notifications, setNotifications] = useState(() => {
    // Khởi tạo từ localStorage nếu có
    const savedNotifications = localStorage.getItem("courseNotifications");
    return savedNotifications ? JSON.parse(savedNotifications) : [];
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] =
    useState(false);
  const [lastKnownCourses, setLastKnownCourses] = useState(() => {
    // Lấy danh sách khóa học đã biết từ localStorage
    const saved = localStorage.getItem("lastKnownCourses");
    return saved ? JSON.parse(saved) : [];
  });

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const shouldShowToast = localStorage.getItem("showSuccessToast");
    if (shouldShowToast) {
      localStorage.removeItem("showSuccessToast"); // Xóa trạng thái sau khi hiển thị để tránh hiển thị lại khi tải lại trang
    }
  }, []);

  useEffect(() => {
    // Cuộn lên đầu trang mỗi khi URL thay đổi
    window.scrollTo(0, 0);
  }, [location]);

  // Cập nhật unreadCount khi component mount
  useEffect(() => {
    const unreadNotifications = notifications.filter(
      (notification) => !notification.read
    );
    setUnreadCount(unreadNotifications.length);
  }, []);

  // Theo dõi khóa học mới
  useEffect(() => {
    const fetchCoursesData = async () => {
      try {
        const newCourses = await fetchCoursesAPI();
        setCourses(newCourses);

        // Kiểm tra khóa học mới bằng cách so sánh với lastKnownCourses
        const newAddedCourses = newCourses.filter(
          (course) =>
            !lastKnownCourses.some((prevCourse) => prevCourse.id === course.id)
        );
        setNewlyAddedCourses(newAddedCourses.map((course) => course.id));

        if (newAddedCourses.length > 0) {
          const newNotifications = newAddedCourses.map((course) => ({
            id: Date.now() + Math.random(),
            courseId: course.id,
            title: course.title,
            message: `Khóa học mới: ${course.title}`,
            timestamp: new Date().toISOString(),
            read: false,
          }));

          // Cập nhật notifications và localStorage
          const updatedNotifications = [...newNotifications, ...notifications];
          setNotifications(updatedNotifications);
          localStorage.setItem(
            "courseNotifications",
            JSON.stringify(updatedNotifications)
          );

          // Cập nhật unreadCount
          setUnreadCount((prev) => prev + newAddedCourses.length);

          // Cập nhật lastKnownCourses
          setLastKnownCourses(newCourses);
          localStorage.setItem("lastKnownCourses", JSON.stringify(newCourses));
        }
      } catch (err) {
        console.error("Lỗi khi tải danh sách khóa học:", err);
        setError("Lỗi khi tải danh sách khóa học. Vui lòng thử lại sau.");
        message.error("Lỗi khi tải danh sách khóa học. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchCoursesData();
    // Kiểm tra khóa học mới mỗi 30 giây
    const interval = setInterval(fetchCoursesData, 30000);

    return () => clearInterval(interval);
  }, [lastKnownCourses]);

  const handleNotificationClick = () => {
    setIsNotificationDrawerOpen(true);
  };

  const handleNotificationClose = () => {
    setIsNotificationDrawerOpen(false);

    // Đánh dấu tất cả thông báo là đã đọc
    const updatedNotifications = notifications.map((notification) => ({
      ...notification,
      read: true,
    }));

    // Cập nhật state và localStorage
    setNotifications(updatedNotifications);
    localStorage.setItem(
      "courseNotifications",
      JSON.stringify(updatedNotifications)
    );
    setUnreadCount(0);
  };

  const handleMenuClick = (path) => {
    if (path === "notifications") {
      handleNotificationClick();
    } else {
      navigate(path);
    }
  };
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const items2 = [
    {
      key: "1",
      icon: <LaptopOutlined />,
      label: "Khóa học",
      children: [
        { label: "Khóa học của tôi", path: "my-courses" },
        { label: "Khóa học mới", path: "/" },
        { label: "Khóa học yêu thích", path: "/" },
      ],
    },
    {
      key: "2",
      icon: <UserOutlined />,
      label: "Giới thiệu",
      children: [{ label: "Mở rộng", path: "introduce" }],
    },
    {
      key: "3",
      icon: <NotificationOutlined />,
      label: (
        <Badge count={unreadCount} offset={[10, 0]}>
          Thông báo
        </Badge>
      ),
      children: [
        { label: "Thông báo mới", path: "notifications" },
        { label: "Thông báo quan trọng", path: "/" },
        { label: "Thông báo khác", path: "/" },
      ],
    },
    {
      key: "4",
      icon: <TrophyOutlined />, // Icon cho mục chứng chỉ
      label: "Chứng chỉ",
      children: [{ label: "Danh sách chứng chỉ", path: "certificates" }],
    },
  ].map((menu) => ({
    ...menu,
    children: menu.children.map((item, index) => ({
      key: `${menu.key}-${index}`,
      label: item.label,
      onClick: () => handleMenuClick(item.path),
    })),
  }));

  // Render function cho các khóa học
  const renderHomeContent = () => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentCourses = courses.slice(startIndex, endIndex);

    return (
      <div>
        <h4 style={{ fontSize: 18, margin: 20 }}>Tất cả khóa học</h4>
        <div className="course-list">
          {currentCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              newlyAddedCourses={newlyAddedCourses}
            />
          ))}
        </div>
      </div>
    );
  };

  if (loading) return <Loader />;
  if (error) return <p>{error}</p>;

  return (
    <Layout className="">
      <Header style={{ background: colorBgContainer }}>
        <Menu
          mode="horizontal"
          defaultSelectedKeys={["1"]}
          items={items2}
          className="header-menu"
        />
      </Header>
      <FeaturedCourses
        courses={courses
          .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
          .slice(0, 8)
          .map((course) => ({
            ...course,
            image: course.image || defaultImage,
            rating: course.rating || 4.5,
            reviewCount: course.reviewCount || 0,
            instructor: course.instructor || "Giảng viên",
          }))}
      />
      <Testimonials />
      <Content style={{ padding: "0 24px 24px" }}>
        <Breadcrumb className="breadcrumb" items={[{ title: "" }]} />
        <div className="content">
          {location.pathname === "/" ? renderHomeContent() : <Outlet />}
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={courses.length}
            onChange={(page) => setCurrentPage(page)}
            style={{ marginTop: "16px", textAlign: "center" }}
          />
        </div>
      </Content>
      <LatestBlog />
      <Drawer
        title="Thông báo mới"
        placement="right"
        onClose={handleNotificationClose}
        open={isNotificationDrawerOpen}
        width={320}
      >
        <List
          dataSource={notifications}
          renderItem={(notification) => (
            <List.Item
              style={{
                cursor: "pointer",
                transition: "background-color 0.3s",
                padding: "12px",
              }}
              className="hover:bg-gray-100"
            >
              <List.Item.Meta
                onClick={() => {
                  navigate(`/courses/${notification.courseId}`);
                  handleNotificationClose();
                }}
                title={
                  <span style={{ color: notification.read ? "#666" : "#000" }}>
                    {notification.title}
                    {!notification.read && (
                      <span style={{ marginLeft: "8px", color: "red" }}>
                        <Tag color="red" style={{ marginRight: "8px" }}>
                          New
                        </Tag>
                      </span>
                    )}
                  </span>
                }
                description={
                  <>
                    <div>{notification.message}</div>
                    <div style={{ fontSize: "12px", color: "#888" }}>
                      {new Date(notification.timestamp).toLocaleString()}
                    </div>
                  </>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: "Không có thông báo mới" }}
        />
      </Drawer>
    </Layout>
  );
};

export default HomePage;

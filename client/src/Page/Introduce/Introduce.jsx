import { useEffect } from "react";
import { Layout, Button, Card, Row, Col, Statistic, Timeline } from "antd";
import {
  BookOutlined,
  TeamOutlined,
  TrophyOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import AOS from "aos";
import "aos/dist/aos.css";
import styles from "./Introduce.module.scss";

const { Content } = Layout;

const Introduce = () => {
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
    });
  }, []);

  return (
    <Layout className={styles.layout}>
      <Content>
        {/* Hero Section */}
        <section className={styles.hero} id="home">
          <div className={styles.heroContent} data-aos="fade-up">
            <h1>Nền tảng học trực tuyến hàng đầu</h1>
            <p>
              Khám phá hàng ngàn khóa học chất lượng cao từ các chuyên gia hàng
              đầu
            </p>
            <Button type="primary" size="large">
              Bắt đầu học ngay
            </Button>
          </div>
        </section>

        {/* Stats Section */}
        <section className={styles.stats}>
          <Row gutter={[32, 32]} justify="center">
            <Col xs={24} sm={12} md={6}>
              <Card data-aos="zoom-in">
                <Statistic
                  title="Học viên"
                  value={50000}
                  prefix={<TeamOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card data-aos="zoom-in" data-aos-delay="100">
                <Statistic
                  title="Khóa học"
                  value={200}
                  prefix={<BookOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card data-aos="zoom-in" data-aos-delay="200">
                <Statistic
                  title="Chứng chỉ"
                  value={15000}
                  prefix={<TrophyOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card data-aos="zoom-in" data-aos-delay="300">
                <Statistic
                  title="Giảng viên"
                  value={100}
                  prefix={<TeamOutlined />}
                />
              </Card>
            </Col>
          </Row>
        </section>

        {/* Features Section */}
        <section className={styles.features} id="features">
          <h2 data-aos="fade-up">Tại sao chọn chúng tôi?</h2>
          <Row gutter={[32, 32]}>
            <Col xs={24} md={8}>
              <div className={styles.featureCard} data-aos="fade-right">
                <RocketOutlined className={styles.featureIcon} />
                <h3>Học linh hoạt</h3>
                <p>Học mọi lúc mọi nơi với nội dung được cá nhân hóa</p>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className={styles.featureCard} data-aos="fade-up">
                <TeamOutlined className={styles.featureIcon} />
                <h3>Cộng đồng hỗ trợ</h3>
                <p>Kết nối với giảng viên và học viên khác 24/7</p>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className={styles.featureCard} data-aos="fade-left">
                <TrophyOutlined className={styles.featureIcon} />
                <h3>Chứng chỉ công nhận</h3>
                <p>Nhận chứng chỉ có giá trị sau khi hoàn thành khóa học</p>
              </div>
            </Col>
          </Row>
        </section>

        {/* Learning Path Section */}
        <section className={styles.learningPath}>
          <h2 data-aos="fade-up">Lộ trình học tập</h2>
          <Timeline mode="alternate" className={styles.timeline}>
            <Timeline.Item data-aos="fade-right">
              <h3>Bắt đầu hành trình</h3>
              <p>Đăng ký tài khoản và khám phá khóa học phù hợp</p>
            </Timeline.Item>
            <Timeline.Item data-aos="fade-left">
              <h3>Học tập linh hoạt</h3>
              <p>Truy cập nội dung học tập mọi lúc mọi nơi</p>
            </Timeline.Item>
            <Timeline.Item data-aos="fade-right">
              <h3>Thực hành dự án</h3>
              <p>Áp dụng kiến thức vào các dự án thực tế</p>
            </Timeline.Item>
            <Timeline.Item data-aos="fade-left">
              <h3>Nhận chứng chỉ</h3>
              <p>Hoàn thành khóa học và nhận chứng chỉ</p>
            </Timeline.Item>
          </Timeline>
        </section>
      </Content>
    </Layout>
  );
};

export default Introduce;
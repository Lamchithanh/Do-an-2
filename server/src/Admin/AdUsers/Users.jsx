import React, { useState, useEffect, useCallback } from "react";
import {
  Tabs,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Spin,
  message,
  Switch,
} from "antd";
import axios from "axios";
import LockUserModal from "./LockInterface";

const { TabPane } = Tabs;
const { Option } = Select;

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [lockModalVisible, setLockModalVisible] = useState(false);
  const [lockingUser, setLockingUser] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:9000/api/users");
      const updatedUsers = response.data;
      setUsers(updatedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      message.error("Unable to load users. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateLockedStatus = useCallback(() => {
    setUsers((prevUsers) =>
      prevUsers.map((user) => {
        if (!user.isLocked || !user.lockedUntil) return user;

        const lockEndTime = new Date(user.lockedUntil).getTime();
        const now = new Date().getTime();

        if (now >= lockEndTime) {
          return {
            ...user,
            isLocked: false,
            lockedUntil: null,
            lockReason: null,
          };
        }
        return user;
      })
    );
  }, []);

  const calculateLockUntil = (duration) => {
    if (duration === "permanent") return null;

    const now = new Date();

    // Xử lý thời gian tùy chọn
    if (/^\d+[phd]$/.test(duration)) {
      const value = parseInt(duration);
      const unit = duration.slice(-1);
      const multipliers = {
        p: 60 * 1000, // phút
        h: 60 * 60 * 1000, // giờ
        d: 24 * 60 * 60 * 1000, // ngày
      };
      const futureTime = new Date(now.getTime() + value * multipliers[unit]);
      return futureTime.toISOString();
    }

    // Xử lý các trường hợp định sẵn
    const durationMap = {
      "1p": 60 * 1000,
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };

    const milliseconds = durationMap[duration];
    if (!milliseconds) return null;

    const futureTime = new Date(now.getTime() + milliseconds);
    return futureTime.toISOString();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return null;
    // Chuyển đổi thời gian từ UTC sang giờ địa phương
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(date);
  };

  const isAccountLocked = (user) => {
    if (!user.isLocked) return false;

    // Nếu không có lockedUntil -> khóa vĩnh viễn
    if (!user.lockedUntil) return true;

    const lockEndTime = new Date(user.lockedUntil).getTime();
    const now = new Date().getTime();

    return now < lockEndTime;
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      setUsers((prevUsers) =>
        prevUsers.map((user) => {
          const lockStatus = getLockStatus(user);
          if (!lockStatus.isLocked && user.isLocked) {
            return {
              ...user,
              isLocked: false,
              lockedUntil: null,
              lockReason: null,
            };
          }
          return user;
        })
      );
    }, 50000);

    return () => clearInterval(intervalId);
  }, []);

  const handleAddOrUpdateUser = async (values) => {
    try {
      if (editingUser) {
        await axios.put(
          `http://localhost:9000/api/users/${editingUser.id}`,
          values
        );
        message.success(
          `Cập nhật thông tin người dùng "${values.username}" thành công!`
        );
      } else {
        await axios.post("http://localhost:9000/api/users", values);
        message.success(`Thêm mới người dùng "${values.username}" thành công!`);
      }
      setModalVisible(false);
      form.resetFields();
      fetchUsers(); // Fetch lại danh sách sau khi thêm/sửa
    } catch (error) {
      console.error("Lỗi khi thêm/cập nhật người dùng:", error);
      const errorMessage =
        error.response?.data?.message ||
        (editingUser
          ? `Không thể cập nhật người dùng "${values.username}". Vui lòng thử lại!`
          : `Không thể thêm người dùng "${values.username}". Vui lòng thử lại!`);
      message.error(errorMessage);
    }
  };

  const handleDeleteUser = (userId) => {
    Modal.confirm({
      title: "Bạn có chắc muốn xóa tài khoản này?",
      content: "Hành động này không thể hoàn tác.",
      okText: "OK",
      okType: "danger",
      cancelText: "No",
      onOk: async () => {
        try {
          await axios.delete(`http://localhost:9000/api/users/${userId}`);
          message.success("User deleted successfully");
          fetchUsers(); // Fetch lại sau khi xóa
        } catch (error) {
          console.error("Error deleting user:", error);
          message.error("Unable to delete user. Please try again.");
        }
      },
    });
  };

  const handleConfirmLock = async (lockData) => {
    try {
      let duration = lockData.duration;
      if (duration === "custom") {
        duration = `${lockData.customDurationValue}${lockData.customDurationUnit}`;
      }

      const lockedUntil = calculateLockUntil(duration);

      const lockPayload = {
        isLocked: true,
        lockReason: lockData.lockReason,
        duration: duration,
        lockedUntil: lockedUntil,
      };

      const response = await axios.put(
        `http://localhost:9000/api/users/${lockingUser.id}/lock`,
        lockPayload
      );

      // Cập nhật state với dữ liệu mới
      setUsers((prevUsers) =>
        prevUsers.map((user) => {
          if (user.id === lockingUser.id) {
            return {
              ...user,
              isLocked: true,
              lockedUntil: lockedUntil,
              lockReason: lockData.lockReason,
            };
          }
          return user;
        })
      );

      setLockModalVisible(false);
    } catch (error) {
      console.error("Lỗi khi khóa tài khoản:", error);
      message.error("Không thể khóa tài khoản. Vui lòng thử lại.");
    }
  };

  const handleToggleLock = async (user, checked) => {
    if (checked) {
      // Khi bật khóa
      setLockingUser(user);
      setLockModalVisible(true);
    } else {
      // Khi mở khóa
      try {
        const response = await axios.put(
          `http://localhost:9000/api/users/${user.id}/lock`,
          {
            isLocked: false,
            lockReason: null,
            duration: null,
            lockedUntil: null,
          }
        );

        // Cập nhật state ngay lập tức
        setUsers((prevUsers) =>
          prevUsers.map((u) => {
            if (u.id === user.id) {
              return {
                ...u,
                isLocked: false,
                lockReason: null,
                lockedUntil: null,
              };
            }
            return u;
          })
        );

        message.success("Đã mở khóa tài khoản thành công");
      } catch (error) {
        console.error("Lỗi khi mở khóa tài khoản:", error);
        message.error("Không thể mở khóa tài khoản. Vui lòng thử lại.");
      }
    }
  };

  const getLockStatus = (user) => {
    // Nếu không bị khóa
    if (!user.isLocked) {
      return {
        isLocked: false,
        status: "Hoạt động",
      };
    }

    // Khóa vĩnh viễn
    if (!user.lockedUntil) {
      return {
        isLocked: true,
        status: "Khóa vĩnh viễn",
      };
    }

    // Kiểm tra thời gian khóa tạm thời
    const lockEndTime = new Date(user.lockedUntil).getTime();
    const now = new Date().getTime();

    if (now < lockEndTime) {
      return {
        isLocked: true,
        status: `Tạm khóa đến: ${formatDateTime(user.lockedUntil)}`,
      };
    }

    // Đã hết thời gian khóa
    return {
      isLocked: false,
      status: "Hoạt động",
    };
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id" },
    { title: "Danh tính", dataIndex: "username", key: "username" },
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "Vai Trò", dataIndex: "role", key: "role" },
    {
      title: "Khóa Tài Khoản",
      dataIndex: "isLocked",
      key: "isLocked",
      render: (_, record) => {
        const lockStatus = getLockStatus(record);
        return (
          <Switch
            checked={lockStatus.isLocked}
            onChange={(checked) => handleToggleLock(record, checked)}
          />
        );
      },
    },
    {
      title: "Trạng Thái Khóa",
      key: "lockStatus",
      render: (_, record) => {
        const lockStatus = getLockStatus(record);
        return <span>{lockStatus.status}</span>;
      },
    },
    {
      title: "Hành Động",
      key: "action",
      render: (_, record) => (
        <>
          <Button
            onClick={() => {
              setEditingUser(record);
              form.setFieldsValue(record);
              setModalVisible(true);
            }}
          >
            Sửa
          </Button>
          <Button
            onClick={() => handleDeleteUser(record.id)}
            style={{ marginLeft: 8 }}
          >
            Xóa
          </Button>
        </>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <Button
        onClick={() => {
          setEditingUser(null);
          form.resetFields();
          setModalVisible(true);
        }}
        style={{ marginBottom: 16 }}
      >
        Thêm Người Dùng
      </Button>

      <Tabs defaultActiveKey="1">
        <TabPane tab="Học Viên" key="1">
          <Table
            columns={columns}
            dataSource={users.filter((user) => user.role === "student")}
            rowKey="id"
          />
        </TabPane>
        {/* <TabPane tab="Giảng Viên" key="2">
          <Table
            columns={columns}
            dataSource={users.filter((user) => user.role === "instructor")}
            rowKey="id"
          />
        </TabPane> */}
      </Tabs>

      <Modal
        title={editingUser ? "Chỉnh sửa người dùng" : "Thêm người dùng"}
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
      >
        <Form form={form} layout="vertical" onFinish={handleAddOrUpdateUser}>
          <Form.Item
            name="username"
            label="Họ & Tên"
            rules={[{ required: true, message: "Vui lòng Nhập tên đầy đủ!" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, message: "Vui lòng nhập email!" }]}
          >
            <Input />
          </Form.Item>
          {!editingUser && (
            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: "Vui lòng nhập password!" }]}
            >
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item
            name="role"
            label="Vai Trò"
            rules={[{ required: true, message: "Vui lòng chọn vai trò!" }]}
          >
            <Select>
              <Option value="student">Student</Option>
              <Option value="instructor">Instructor</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <LockUserModal
        user={lockingUser}
        visible={lockModalVisible}
        onCancel={() => setLockModalVisible(false)}
        onConfirm={handleConfirmLock}
      />
    </Spin>
  );
};

export default Users;

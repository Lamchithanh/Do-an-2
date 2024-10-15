import React, { useState, useEffect, useCallback } from "react";
import {
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

const { Option } = Select;

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form] = Form.useForm();

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get("http://localhost:9000/api/users");
            setUsers(response.data);
        } catch (error) {
            console.error("Error fetching users:", error);
            message.error("Unable to load users. Please try again later.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleAddOrUpdateUser = async (values) => {
        try {
            if (editingUser) {
                await axios.put(`http://localhost:9000/api/users/${editingUser.id}`, values);
                message.success("User updated successfully");
            } else {
                await axios.post("http://localhost:9000/api/users", values);
                message.success("User added successfully");
            }
            setModalVisible(false);
            form.resetFields();
            fetchUsers();
        } catch (error) {
            console.error("Error adding/updating user:", error);
            message.error("Unable to add/update user. Please try again.");
        }
    };

    const handleDeleteUser = async (userId) => {
        try {
            await axios.delete(`http://localhost:9000/api/users/${userId}`);
            message.success("User deleted successfully");
            fetchUsers();
        } catch (error) {
            console.error("Error deleting user:", error);
            message.error("Unable to delete user. Please try again.");
        }
    };

    const toggleAccountLock = async (userId, isLocked) => {
        try {
            await axios.put(`http://localhost:9000/api/users/${userId}/lock`, { isLocked });
            message.success(`User account ${isLocked ? "locked" : "unlocked"} successfully`);
            fetchUsers();
        } catch (error) {
            console.error("Error updating account lock status:", error);
            message.error("Unable to update account lock status. Please try again.");
        }
    };

    const columns = [
        { title: "ID", dataIndex: "id", key: "id" },
        { title: "Username", dataIndex: "username", key: "username" },
        { title: "Email", dataIndex: "email", key: "email" },
        { title: "Role", dataIndex: "role", key: "role" },
        {
            title: "Account Locked",
            dataIndex: "isLocked",
            key: "isLocked",
            render: (_, record) => (
                <Switch
                    checked={record.isLocked}
                    onChange={() => toggleAccountLock(record.id, !record.isLocked)}
                />
            ),
        },
        {
            title: "Action",
            key: "action",
            render: (_, record) => (
                <>
                    <Button onClick={() => {
                        setEditingUser(record);
                        form.setFieldsValue(record);
                        setModalVisible(true);
                    }}>
                        Edit
                    </Button>
                    <Button onClick={() => handleDeleteUser(record.id)} style={{ marginLeft: 8 }}>
                        Delete
                    </Button>
                </>
            ),
        },
    ];

    return (
        <Spin spinning={loading}>
            <Button onClick={() => {
                setEditingUser(null);
                form.resetFields();
                setModalVisible(true);
            }} style={{ marginBottom: 16 }}>
                Add New User
            </Button>

            <Table columns={columns} dataSource={users} rowKey="id" />

            <Modal
                title={editingUser ? "Edit User" : "Add New User"}
                visible={modalVisible}
                onOk={() => form.submit()}
                onCancel={() => {
                    setModalVisible(false);
                    form.resetFields();
                }}
            >
                <Form form={form} layout="vertical" onFinish={handleAddOrUpdateUser}>
                    <Form.Item name="username" label="Username" rules={[{ required: true, message: "Please input the username!" }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ required: true, message: "Please input the email!" }]}>
                        <Input />
                    </Form.Item>
                    {!editingUser && (
                        <Form.Item name="password" label="Password" rules={[{ required: true, message: "Please input the password!" }]}>
                            <Input.Password />
                        </Form.Item>
                    )}
                    <Form.Item name="role" label="Role" rules={[{ required: true, message: "Please select the role!" }]}>
                        <Select>
                            <Option value="student">Student</Option>
                            <Option value="instructor">Instructor</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </Spin>
    );
};

export default Users;
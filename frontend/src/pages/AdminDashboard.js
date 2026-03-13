import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import {
  Users,
  Package,
  DollarSign,
  TrendingUp,
  CheckCircle,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminDashboard() {
  const { getAuthHeader } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchProducts();
    fetchWithdrawals();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`, {
        headers: getAuthHeader(),
      });
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users`, {
        headers: getAuthHeader(),
      });
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/admin/products`, {
        headers: getAuthHeader(),
      });
      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching products", error);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const response = await axios.get(`${API}/admin/withdrawals`, {
        headers: getAuthHeader(),
      });
      setWithdrawals(response.data);
    } catch (error) {
      console.error("Error fetching withdrawals", error);
    }
  };

  const handleApproveWithdrawal = async (withdrawalId) => {
    try {
      await axios.put(
        `${API}/admin/withdrawals/${withdrawalId}/approve`,
        {},
        { headers: getAuthHeader() }
      );
      toast.success("تم الموافقة على طلب السحب");
      fetchWithdrawals();
    } catch (error) {
      console.error("Error approving withdrawal", error);
      toast.error("فشل الموافقة");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex justify-center items-center py-20">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="container mx-auto px-6 py-10">
        <h1 className="text-4xl font-heading font-bold text-slate-900 mb-8">
          لوحة تحكم الإدارة
        </h1>

        {/* Stats */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-6 mb-8" data-testid="admin-stats">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">إجمالي المستخدمين</p>
                    <p className="text-2xl font-bold">{stats.total_users}</p>
                  </div>
                  <Users className="w-10 h-10 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">إجمالي المنتجات</p>
                    <p className="text-2xl font-bold">{stats.total_products}</p>
                  </div>
                  <Package className="w-10 h-10 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">إجمالي المبيعات</p>
                    <p className="text-2xl font-bold">
                      ${stats.total_sales.toFixed(2)}
                    </p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-emerald-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">إجمالي العمولات</p>
                    <p className="text-2xl font-bold text-orange-600">
                      ${stats.total_commission.toFixed(2)}
                    </p>
                  </div>
                  <DollarSign className="w-10 h-10 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="users" data-testid="users-tab">
              المستخدمون
            </TabsTrigger>
            <TabsTrigger value="products" data-testid="products-tab">
              المنتجات
            </TabsTrigger>
            <TabsTrigger value="withdrawals" data-testid="withdrawals-tab">
              طلبات السحب
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>جميع المستخدمين</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                    >
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-slate-600">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm ${
                            user.role === "seller"
                              ? "bg-orange-100 text-orange-700"
                              : user.role === "admin"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {user.role === "seller"
                            ? "بائع"
                            : user.role === "admin"
                            ? "مدير"
                            : "مشتري"}
                        </span>
                        {user.role === "seller" && (
                          <span className="text-sm text-slate-600">
                            الرصيد: ${user.balance?.toFixed(2) || "0.00"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>جميع المنتجات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{product.title}</p>
                        <p className="text-sm text-slate-600">
                          البائع: {product.seller_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-emerald-600 font-medium">
                          ${product.price}
                        </span>
                        <span className="text-sm text-slate-600">
                          {product.downloads_count} تحميل
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals">
            <Card>
              <CardHeader>
                <CardTitle>طلبات السحب</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {withdrawals.length === 0 ? (
                    <p className="text-center text-slate-600 py-10">
                      لا توجد طلبات سحب
                    </p>
                  ) : (
                    withdrawals.map((withdrawal) => (
                      <div
                        key={withdrawal.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                      >
                        <div>
                          <p className="font-medium">{withdrawal.seller_name}</p>
                          <p className="text-sm text-slate-600">
                            ${withdrawal.amount} -{" "}
                            {new Date(withdrawal.created_at).toLocaleDateString(
                              "ar"
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-3 py-1 rounded-full text-sm ${
                              withdrawal.status === "approved"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {withdrawal.status === "approved"
                              ? "موافق عليه"
                              : "قيد المراجعة"}
                          </span>
                          {withdrawal.status === "pending" && (
                            <Button
                              onClick={() => handleApproveWithdrawal(withdrawal.id)}
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              data-testid={`approve-withdrawal-${withdrawal.id}`}
                            >
                              <CheckCircle className="w-4 h-4 ml-2" />
                              موافقة
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}

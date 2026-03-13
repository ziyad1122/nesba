import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import StripeConnectSettings from "../components/StripeConnectSettings";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import {
  Package,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Upload,
  Settings,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const categories = [
  { value: "ebook", label: "كتب إلكترونية" },
  { value: "design", label: "تصاميم" },
  { value: "course", label: "دورات" },
  { value: "software", label: "برمجيات" },
  { value: "template", label: "قوالب" },
  { value: "other", label: "أخرى" },
];

export default function SellerDashboard() {
  const { user, getAuthHeader } = useAuth();
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newProduct, setNewProduct] = useState({
    title: "",
    description: "",
    price: "",
    category: "ebook",
    cover_image: "",
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingProduct, setUploadingProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchSales();
    fetchWithdrawals();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products/seller/${user.id}`);
      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching products", error);
    }
  };

  const fetchSales = async () => {
    try {
      const response = await axios.get(`${API}/orders/my-sales`, {
        headers: getAuthHeader(),
      });
      setSales(response.data);
    } catch (error) {
      console.error("Error fetching sales", error);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const response = await axios.get(`${API}/withdrawals/my-requests`, {
        headers: getAuthHeader(),
      });
      setWithdrawals(response.data);
    } catch (error) {
      console.error("Error fetching withdrawals", error);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/products`,
        { ...newProduct, price: parseFloat(newProduct.price) },
        { headers: getAuthHeader() }
      );
      toast.success("تم إضافة المنتج بنجاح");
      setNewProduct({
        title: "",
        description: "",
        price: "",
        category: "ebook",
        cover_image: "",
      });
      fetchProducts();
    } catch (error) {
      console.error("Error creating product", error);
      toast.error("فشل إضافة المنتج");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (productId) => {
    if (!selectedFile) {
      toast.error("يرجى اختيار ملف");
      return;
    }

    setUploadingProduct(productId);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      await axios.post(`${API}/products/${productId}/upload`, formData, {
        headers: {
          ...getAuthHeader(),
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("تم رفع الملف بنجاح");
      setSelectedFile(null);
      fetchProducts();
    } catch (error) {
      console.error("Error uploading file", error);
      toast.error("فشل رفع الملف");
    } finally {
      setUploadingProduct(null);
    }
  };

  const handleRequestWithdrawal = async () => {
    const amount = prompt("أدخل المبلغ المطلوب سحبه:");
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return;

    try {
      await axios.post(
        `${API}/withdrawals/request?amount=${parseFloat(amount)}`,
        {},
        { headers: getAuthHeader() }
      );
      toast.success("تم تقديم طلب السحب بنجاح");
      fetchWithdrawals();
    } catch (error) {
      console.error("Error requesting withdrawal", error);
      toast.error(error.response?.data?.detail || "فشل طلب السحب");
    }
  };

  const totalEarnings = sales.reduce((sum, sale) => sum + sale.seller_amount, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="container mx-auto px-6 py-10">
        <h1 className="text-4xl font-heading font-bold text-slate-900 mb-8">
          لوحة تحكم البائع
        </h1>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">رصيدي</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ${user?.balance?.toFixed(2) || "0.00"}
                  </p>
                </div>
                <DollarSign className="w-10 h-10 text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">إجمالي الأرباح</p>
                  <p className="text-2xl font-bold">${totalEarnings.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">المنتجات</p>
                  <p className="text-2xl font-bold">{products.length}</p>
                </div>
                <Package className="w-10 h-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">المبيعات</p>
                  <p className="text-2xl font-bold">{sales.length}</p>
                </div>
                <ShoppingBag className="w-10 h-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="products" data-testid="products-tab">
              منتجاتي
            </TabsTrigger>
            <TabsTrigger value="add" data-testid="add-product-tab">
              إضافة منتج
            </TabsTrigger>
            <TabsTrigger value="sales" data-testid="sales-tab">
              المبيعات
            </TabsTrigger>
            <TabsTrigger value="withdrawals" data-testid="withdrawals-tab">
              السحوبات
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="settings-tab">
              <Settings className="w-4 h-4 ml-2" />
              الإعدادات
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            {products.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center">
                  <p className="text-slate-600">لم تقم بإضافة أي منتجات بعد</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <Card key={product.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-heading font-semibold mb-2">
                            {product.title}
                          </h3>
                          <p className="text-slate-600 text-sm mb-3">
                            {product.description}
                          </p>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <span className="text-emerald-600 font-medium">
                              ${product.price}
                            </span>
                            <span className="text-slate-500">
                              {product.downloads_count} تحميل
                            </span>
                            <span className="text-slate-500">
                              {product.reviews_count} تقييم
                            </span>
                          </div>
                        </div>

                        {!product.file_url && (
                          <div className="mr-4">
                            <Input
                              type="file"
                              onChange={(e) => setSelectedFile(e.target.files[0])}
                              className="mb-2"
                              data-testid={`file-input-${product.id}`}
                            />
                            <Button
                              onClick={() => handleFileUpload(product.id)}
                              disabled={uploadingProduct === product.id}
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700"
                              data-testid={`upload-button-${product.id}`}
                            >
                              <Upload className="w-4 h-4 ml-2" />
                              رفع ملف
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Add Product Tab */}
          <TabsContent value="add">
            <Card>
              <CardHeader>
                <CardTitle>إضافة منتج جديد</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateProduct} className="space-y-4">
                  <div>
                    <Label htmlFor="title">عنوان المنتج</Label>
                    <Input
                      id="title"
                      value={newProduct.title}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, title: e.target.value })
                      }
                      required
                      data-testid="product-title-input"
                      className="h-12"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">الوصف</Label>
                    <Textarea
                      id="description"
                      value={newProduct.description}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, description: e.target.value })
                      }
                      required
                      rows={4}
                      data-testid="product-description-input"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">السعر (USD)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={newProduct.price}
                        onChange={(e) =>
                          setNewProduct({ ...newProduct, price: e.target.value })
                        }
                        required
                        data-testid="product-price-input"
                        className="h-12"
                      />
                    </div>

                    <div>
                      <Label htmlFor="category">التصنيف</Label>
                      <select
                        id="category"
                        value={newProduct.category}
                        onChange={(e) =>
                          setNewProduct({ ...newProduct, category: e.target.value })
                        }
                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                        data-testid="product-category-select"
                      >
                        {categories.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="cover_image">رابط صورة الغلاف (اختياري)</Label>
                    <Input
                      id="cover_image"
                      value={newProduct.cover_image}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, cover_image: e.target.value })
                      }
                      placeholder="https://..."
                      className="h-12"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-full py-6"
                    data-testid="create-product-button"
                  >
                    {loading ? "جاري الإضافة..." : "إضافة المنتج"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sales Tab */}
          <TabsContent value="sales">
            {sales.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center">
                  <p className="text-slate-600">لا توجد مبيعات بعد</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sales.map((sale) => (
                  <Card key={sale.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{sale.product_title}</h3>
                          <div className="flex gap-4 text-sm text-slate-600 mt-2">
                            <span>السعر: ${sale.amount}</span>
                            <span>العمولة: ${sale.commission.toFixed(2)}</span>
                            <span className="text-emerald-600 font-medium">
                              ربحك: ${sale.seller_amount.toFixed(2)}
                            </span>
                            <span>
                              {new Date(sale.created_at).toLocaleDateString("ar")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals">
            <div className="mb-6">
              <Button
                onClick={handleRequestWithdrawal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full"
                data-testid="request-withdrawal-button"
              >
                طلب سحب
              </Button>
            </div>

            {withdrawals.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center">
                  <p className="text-slate-600">لا توجد طلبات سحب</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {withdrawals.map((withdrawal) => (
                  <Card key={withdrawal.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold">${withdrawal.amount}</p>
                          <p className="text-sm text-slate-600 mt-1">
                            {new Date(withdrawal.created_at).toLocaleDateString("ar")}
                          </p>
                        </div>
                        <div
                          className={`px-4 py-2 rounded-full text-sm font-medium ${
                            withdrawal.status === "approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : withdrawal.status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {withdrawal.status === "approved"
                            ? "موافق عليه"
                            : withdrawal.status === "pending"
                            ? "قيد المراجعة"
                            : withdrawal.status}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <StripeConnectSettings />
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Download } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function MyPurchases() {
  const navigate = useNavigate();
  const { getAuthHeader } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/my-purchases`, {
        headers: getAuthHeader(),
      });
      setOrders(response.data);
    } catch (error) {
      console.error("Error fetching orders", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (orderId) => {
    try {
      const response = await axios.get(`${API}/orders/${orderId}/download`, {
        headers: getAuthHeader(),
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `product_${orderId}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error downloading product", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="container mx-auto px-6 py-10">
        <h1 className="text-4xl font-heading font-bold text-slate-900 mb-8">
          مشترياتي
        </h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="spinner"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg text-slate-600 mb-4">لم تقم بأي عملية شراء بعد</p>
            <Button
              onClick={() => navigate("/products")}
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-full"
            >
              تصفح المنتجات
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-heading font-semibold text-slate-900 mb-2">
                        {order.product_title}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                        <span>السعر: ${order.amount}</span>
                        <span>
                          الحالة:{" "}
                          <span className="text-emerald-600 font-medium">
                            {order.status === "completed" ? "مكتمل" : order.status}
                          </span>
                        </span>
                        <span>
                          التاريخ: {new Date(order.created_at).toLocaleDateString("ar")}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleDownload(order.id)}
                      className="bg-slate-900 hover:bg-slate-800 text-white rounded-full"
                      data-testid={`download-button-${order.id}`}
                    >
                      <Download className="w-4 h-4 ml-2" />
                      تحميل
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

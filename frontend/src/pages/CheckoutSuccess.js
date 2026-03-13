import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { Card, CardContent } from "../components/ui/card";
import { CheckCircle } from "lucide-react";
import { Button } from "../components/ui/button";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getAuthHeader } = useAuth();
  const [status, setStatus] = useState("pending");
  const [orderId, setOrderId] = useState(null);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus(sessionId, 0);
    }
  }, [sessionId]);

  const pollPaymentStatus = async (sessionId, attempt) => {
    if (attempt >= 5) {
      setStatus("timeout");
      return;
    }

    try {
      const response = await axios.get(`${API}/payments/status/${sessionId}`, {
        headers: getAuthHeader(),
      });

      if (response.data.payment_status === "paid") {
        setStatus("success");
        setOrderId(response.data.order_id);
      } else if (response.data.status === "expired") {
        setStatus("expired");
      } else {
        setTimeout(() => pollPaymentStatus(sessionId, attempt + 1), 2000);
      }
    } catch (error) {
      console.error("Error checking payment status", error);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="container mx-auto px-6 py-20">
        <div className="max-w-md mx-auto">
          <Card className="text-center">
            <CardContent className="p-10">
              {status === "pending" && (
                <div data-testid="payment-processing">
                  <div className="spinner mx-auto mb-6"></div>
                  <h2 className="text-2xl font-heading font-bold mb-2">
                    جاري معالجة الدفع...
                  </h2>
                  <p className="text-slate-600">يرجى الانتظار</p>
                </div>
              )}

              {status === "success" && (
                <div data-testid="payment-success">
                  <CheckCircle className="w-20 h-20 text-emerald-600 mx-auto mb-6" />
                  <h2 className="text-2xl font-heading font-bold mb-2">
                    تم الدفع بنجاح!
                  </h2>
                  <p className="text-slate-600 mb-6">
                    شكرًا على عملية الشراء. يمكنك الآن تحميل المنتج
                  </p>
                  <Button
                    onClick={() => navigate("/my-purchases")}
                    className="bg-orange-600 hover:bg-orange-700 text-white rounded-full px-8"
                    data-testid="view-purchases-button"
                  >
                    عرض مشترياتي
                  </Button>
                </div>
              )}

              {(status === "error" || status === "expired" || status === "timeout") && (
                <div data-testid="payment-error">
                  <h2 className="text-2xl font-heading font-bold mb-2 text-red-600">
                    حدث خطأ
                  </h2>
                  <p className="text-slate-600 mb-6">
                    فشلت عملية الدفع. يرجى المحاولة مرة أخرى
                  </p>
                  <Button
                    onClick={() => navigate("/products")}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-8"
                  >
                    العودة للمنتجات
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

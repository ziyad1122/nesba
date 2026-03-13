import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { CheckCircle, XCircle, AlertCircle, CreditCard } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function StripeConnectSettings() {
  const { getAuthHeader } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/stripe/connect/status`, {
        headers: getAuthHeader(),
      });
      setStatus(response.data);
    } catch (error) {
      console.error("Error fetching Stripe status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      // First, create account if needed
      await axios.post(
        `${API}/stripe/connect/create-account`,
        {},
        { headers: getAuthHeader() }
      );

      // Get onboarding link
      const response = await axios.post(
        `${API}/stripe/connect/onboarding-link`,
        {},
        { headers: getAuthHeader() }
      );

      // Redirect to Stripe onboarding
      window.location.href = response.data.url;
    } catch (error) {
      console.error("Error connecting Stripe:", error);
      toast.error(error.response?.data?.detail || "فشل الاتصال بـ Stripe");
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <div className="spinner mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-blue-600" />
          ربط حساب Stripe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-900">
            📌 لاستلام الأموال مباشرة من مبيعاتك، يجب ربط حساب Stripe الخاص بك.
            ستستلم 97.5% من كل عملية بيع مباشرة على بطاقتك.
          </p>
        </div>

        {!status?.connected ? (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-slate-600">
              <AlertCircle className="w-5 h-5" />
              <span>لم يتم ربط حساب Stripe بعد</span>
            </div>
            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
              data-testid="connect-stripe-button"
            >
              {connecting ? "جاري التوصيل..." : "ربط حساب Stripe"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <span className="font-medium">حالة الاتصال</span>
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="w-5 h-5" />
                <span>متصل</span>
              </div>
            </div>

            {/* Onboarding Status */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <span className="font-medium">إكمال البيانات</span>
              {status.onboarding_complete ? (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle className="w-5 h-5" />
                  <span>مكتمل</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-orange-600">
                  <AlertCircle className="w-5 h-5" />
                  <span>غير مكتمل</span>
                </div>
              )}
            </div>

            {/* Charges Enabled */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <span className="font-medium">استقبال المدفوعات</span>
              {status.charges_enabled ? (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle className="w-5 h-5" />
                  <span>مفعّل</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  <span>غير مفعّل</span>
                </div>
              )}
            </div>

            {/* Payouts Enabled */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <span className="font-medium">سحب الأموال</span>
              {status.payouts_enabled ? (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle className="w-5 h-5" />
                  <span>مفعّل</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  <span>غير مفعّل</span>
                </div>
              )}
            </div>

            {/* Complete Onboarding Button */}
            {!status.onboarding_complete && (
              <div className="pt-4">
                <Button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {connecting ? "جاري التحميل..." : "إكمال إعداد الحساب"}
                </Button>
              </div>
            )}

            {/* Success Message */}
            {status.onboarding_complete && status.charges_enabled && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-sm text-emerald-900 text-center">
                  ✅ حسابك جاهز! ستستلم الأموال مباشرة من مبيعاتك
                </p>
              </div>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-600 leading-relaxed">
            💡 <strong>ملاحظة:</strong> عند ربط حسابك، ستستلم 97.5% من كل عملية
            بيع مباشرة على حسابك في Stripe. العمولة (2.5%) تُخصم تلقائياً لمنصة
            نسبه.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

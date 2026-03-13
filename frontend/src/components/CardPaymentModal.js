import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { CreditCard, Lock } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Card element styling
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "16px",
      color: "#1e293b",
      "::placeholder": {
        color: "#94a3b8",
      },
      fontFamily: "IBM Plex Sans Arabic, sans-serif",
    },
    invalid: {
      color: "#ef4444",
    },
  },
  hidePostalCode: false,
};

function CheckoutForm({ product, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const { getAuthHeader } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create Payment Intent
      const intentResponse = await axios.post(
        `${API}/payments/create-intent`,
        { product_id: product.id, origin_url: window.location.origin },
        { headers: getAuthHeader() }
      );

      const { clientSecret } = intentResponse.data;

      // Confirm card payment
      const { error: stripeError, paymentIntent } =
        await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement),
          },
        });

      if (stripeError) {
        setError(stripeError.message);
        toast.error(stripeError.message);
        return;
      }

      if (paymentIntent.status === "succeeded") {
        // Confirm payment on backend
        await axios.post(
          `${API}/payments/confirm?payment_intent_id=${paymentIntent.id}`,
          {},
          { headers: getAuthHeader() }
        );

        toast.success("تم الدفع بنجاح!");
        onSuccess();
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError(err.response?.data?.detail || "فشلت عملية الدفع");
      toast.error(err.response?.data?.detail || "فشلت عملية الدفع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          معلومات البطاقة
        </label>
        <div className="p-4 border-2 border-slate-200 rounded-xl bg-white hover:border-orange-500 transition-colors">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>

      {error && (
        <div
          className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
          data-testid="payment-error"
        >
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Lock className="w-4 h-4" />
        <span>الدفع آمن ومشفر عبر Stripe</span>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={loading}
        >
          إلغاء
        </Button>
        <Button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          data-testid="pay-button"
        >
          {loading ? "جاري المعالجة..." : `ادفع $${product.price}`}
        </Button>
      </div>
    </form>
  );
}

export default function CardPaymentModal({ product, isOpen, onClose }) {
  const navigate = useNavigate();
  const [stripePromise, setStripePromise] = useState(null);

  // Load Stripe on component mount
  useState(() => {
    async function loadStripeConfig() {
      try {
        const response = await axios.get(`${API}/payments/config`);
        const stripe = await loadStripe(response.data.publishableKey);
        setStripePromise(stripe);
      } catch (error) {
        console.error("Failed to load Stripe config:", error);
        toast.error("فشل تحميل نظام الدفع");
      }
    }
    loadStripeConfig();
  }, []);

  const handleSuccess = () => {
    onClose();
    navigate("/my-purchases");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-orange-600" />
            الدفع بالبطاقة
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Product Summary */}
          <div className="mb-6 p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">المنتج</span>
              <span className="font-medium">{product.title}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">المبلغ الإجمالي</span>
              <span className="text-2xl font-bold text-emerald-600">
                ${product.price}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                يشمل عمولة نسبه 2.5%
              </p>
            </div>
          </div>

          {/* Payment Form */}
          {stripePromise ? (
            <Elements stripe={stripePromise}>
              <CheckoutForm
                product={product}
                onSuccess={handleSuccess}
                onCancel={onClose}
              />
            </Elements>
          ) : (
            <div className="flex justify-center py-8">
              <div className="spinner"></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

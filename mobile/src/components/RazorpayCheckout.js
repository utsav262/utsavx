import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lock, X } from 'lucide-react-native';
import { colors } from '../theme';

/**
 * Razorpay Checkout.js inside a WebView — the same checkout the website opens,
 * so the server's /payments/razorpay/verify flow is unchanged.
 * Posts back { type: 'success', data } | { type: 'dismiss' | 'failed' | 'error', message }.
 */
function checkoutHtml(payment) {
  const options = {
    key: payment.keyId,
    amount: payment.amount,
    currency: payment.currency || 'INR',
    name: 'UtsavX',
    description: `Order ${payment.orderNumber || ''}`.trim(),
    order_id: payment.razorpayOrderId,
    prefill: {
      name: payment.prefill?.name || payment.name || '',
      email: payment.prefill?.email || payment.email || '',
      contact: payment.prefill?.contact || '',
    },
    theme: { color: '#FA13DB' },
  };
  // Escape "<" so option values can never close the <script> tag.
  const json = JSON.stringify(options).replace(/</g, '\\u003c');

  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>body{margin:0;background:#05041A;font-family:Roboto,sans-serif;color:#B6B2D1}
p{padding:48px 24px;text-align:center}</style>
</head>
<body>
<p>Opening secure checkout…</p>
<script>
  function send(message) { window.ReactNativeWebView.postMessage(JSON.stringify(message)); }
  function start() {
    if (!window.Razorpay) { send({ type: 'error', message: 'Could not load Razorpay Checkout. Check your connection and try again.' }); return; }
    var options = ${json};
    options.handler = function (response) { send({ type: 'success', data: response }); };
    options.modal = { ondismiss: function () { send({ type: 'dismiss', message: 'Payment cancelled.' }); } };
    var checkout = new window.Razorpay(options);
    checkout.on('payment.failed', function (event) {
      send({ type: 'failed', message: (event && event.error && event.error.description) || 'Payment failed.' });
    });
    checkout.open();
  }
</script>
<script src="https://checkout.razorpay.com/v1/checkout.js" onload="start()" onerror="start()"></script>
</body>
</html>`;
}

/** UPI apps arrive as intent://…#Intent;scheme=upi;…;end — open them as upi://… */
function externalUrl(url) {
  if (!url.startsWith('intent:')) return url;
  const scheme = /;scheme=([^;]+);/.exec(url)?.[1];
  const target = url.replace(/^intent:\/\//, '').split('#Intent')[0];
  return scheme ? `${scheme}://${target}` : url;
}

export default function RazorpayCheckout({ payment, onResult }) {
  const insets = useSafeAreaInsets();
  const html = useMemo(
    () => (payment ? checkoutHtml(payment) : null),
    [payment],
  );

  const handleMessage = event => {
    try {
      onResult(JSON.parse(event.nativeEvent.data));
    } catch {
      // ignore unrelated messages
    }
  };

  const handleNavigation = req => {
    const url = req.url || '';
    if (/^(https?|about|data|blob):/i.test(url)) return true;
    // UPI / wallet apps (upi://, phonepe://, tez://, paytmmp://…)
    Linking.openURL(externalUrl(url)).catch(() => {});
    return false;
  };

  const cancel = () =>
    onResult({ type: 'dismiss', message: 'Payment cancelled.' });

  return (
    <Modal
      visible={Boolean(payment)}
      animationType="slide"
      onRequestClose={cancel}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.lock}>
            <Lock size={16} color={colors.success} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.title}>Secure payment</Text>
            <Text style={styles.subtitle}>Powered by Razorpay</Text>
          </View>
          <Pressable
            onPress={cancel}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Cancel payment"
          >
            <X size={22} color={colors.text} />
          </Pressable>
        </View>
        {html ? (
          <WebView
            originWhitelist={['*']}
            source={{ html, baseUrl: 'https://checkout.razorpay.com/' }}
            onMessage={handleMessage}
            onShouldStartLoadWithRequest={handleNavigation}
            javaScriptEnabled
            domStorageEnabled
            setSupportMultipleWindows={false}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
            )}
            onError={() =>
              onResult({
                type: 'error',
                message:
                  'Could not load Razorpay Checkout. Check your connection and try again.',
              })
            }
            style={styles.webview}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lock: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successSoft,
  },
  title: { fontSize: 16, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textFaint },
  webview: { flex: 1, backgroundColor: colors.bg },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});

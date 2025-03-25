export function orderStatusSMSTemplate(phoneNumber: string, orderId: string, status: string) {
  const safeOrderId = orderId || 'N/A';
  const safeStatus = status || 'processing';
  return {
    to: phoneNumber,
    message: `📦 Your order #${orderId} has been updated to: ${status}. Thanks for shopping with us!`,
  };
}

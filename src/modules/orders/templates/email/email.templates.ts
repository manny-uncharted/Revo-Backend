export function orderStatusTemplate(email: string, orderId: string, status: string) {
  const safeOrderId = orderId || 'N/A';
  const safeStatus = status || 'processing';
  return {
    to: email,
    subject: `Your Order #${orderId} Status Has Been Updated`,
    html: `
      <h2>Order Status Update</h2>
      <p>Hello,</p>
      <p>We're reaching out to let you know that the status of your order <strong>#${orderId}</strong> has been updated to: <strong>${status}</strong>.</p>
      <p>Thank you for shopping with us!</p>
    `,
  };
}
type SendEmailArgs = {
  to: string;
  subject: string;
  text: string;
};

export async function sendTransactionalEmail(args: SendEmailArgs) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { ok: false, skipped: true as const };

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: args.to }] }],
      from: { email: from.includes("<") ? from.split("<")[1].replace(">", "").trim() : from, name: from },
      subject: args.subject,
      content: [{ type: "text/plain", value: args.text }]
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SendGrid error: ${res.status} ${text}`);
  }
  return { ok: true };
}


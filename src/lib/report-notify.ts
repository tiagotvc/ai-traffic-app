import "server-only";

export async function sendReportEmail(input: {
  to: string;
  subject: string;
  text: string;
  pdfBytes?: Uint8Array;
  filename?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { sent: false, error: "RESEND_API_KEY não configurada" };
  }

  const from = process.env.ALERT_EMAIL_FROM ?? "reports@traffic-ai.local";
  const attachments = input.pdfBytes
    ? [
        {
          filename: input.filename ?? "relatorio.pdf",
          content: Buffer.from(input.pdfBytes).toString("base64")
        }
      ]
    : undefined;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        attachments
      })
    });
    if (!res.ok) {
      const body = await res.text();
      return { sent: false, error: body || "Falha ao enviar e-mail" };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "Erro de rede" };
  }
}

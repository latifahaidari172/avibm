export function emailHtml(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>AVIBM</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header / Logo -->
          <tr>
            <td style="background:#111111;border:1px solid #2a2a2a;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
              <div style="font-size:32px;font-weight:900;letter-spacing:0.2em;color:#C9A84C;font-family:'Arial Black',Arial,sans-serif;">AVIBM</div>
              <div style="font-size:11px;letter-spacing:0.25em;color:#666;margin-top:4px;text-transform:uppercase;">Australian Vehicle Inspection Booking Monitor</div>
              <div style="width:60px;height:2px;background:#C9A84C;margin:16px auto 0;"></div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#141414;border-left:1px solid #2a2a2a;border-right:1px solid #2a2a2a;padding:40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f0f0f;border:1px solid #2a2a2a;border-top:1px solid #1e1e1e;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
              <div style="font-size:12px;color:#444;line-height:1.8;">
                AVIBM — Australian Vehicle Inspection Booking Monitor<br/>
                <a href="https://avibm.vercel.app" style="color:#C9A84C;text-decoration:none;">avibm.vercel.app</a>
              </div>
              <div style="margin-top:12px;font-size:11px;color:#333;">
                If you have any questions, reply to this email and we'll get back to you shortly.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function emailText(content: string): string {
  // Strip HTML tags for plain text fallback
  return content.replace(/<[^>]+>/g, '').replace(/\n\s*\n/g, '\n\n').trim()
}

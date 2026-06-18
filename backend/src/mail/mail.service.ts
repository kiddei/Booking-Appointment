import { Injectable, Logger } from '@nestjs/common'
import * as nodemailer from 'nodemailer'

export interface BookingEmailData {
  bookingId:      number
  courtName:      string
  courtLocation:  string
  courtContact:   string
  courtIndoor:    boolean
  courtNumber:    number
  bookingDate:    string
  startTime:      string
  endTime:        string
  totalAmount:    string
  status:         string
  username:       string
  email:          string
  appUrl:         string
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private transporter: nodemailer.Transporter | null = null

  constructor() {
    const host = process.env.SMTP_HOST
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port:   Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER ?? '',
          pass: process.env.SMTP_PASS ?? '',
        },
      })
    }
  }

  async sendBookingConfirmation(data: BookingEmailData): Promise<void> {
    const subject = `Booking Confirmed — ${data.courtName} on ${this.fmtDate(data.bookingDate)}`
    const html    = this.buildBookingEmail(data)
    await this.sendMail(data.email, subject, html)
  }

  async sendBookingCancellation(data: BookingEmailData): Promise<void> {
    const subject = `Booking Cancelled — ${data.courtName} on ${this.fmtDate(data.bookingDate)}`
    const html    = this.buildBookingEmail(data)
    await this.sendMail(data.email, subject, html)
  }

  private async sendMail(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[MAIL — no SMTP configured] To: ${to} | Subject: ${subject}`)
      return
    }
    try {
      await this.transporter.sendMail({
        from:    process.env.SMTP_FROM ?? '"PicklePro Courts" <no-reply@picklepro.app>',
        to,
        subject,
        html,
      })
      this.logger.log(`Email sent to ${to}: ${subject}`)
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${(err as Error).message}`)
    }
  }

  // ── Helpers ───────────────────────────────────────────────

  private fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
  }

  private fmtTime(t: string) {
    const [h, m] = t.split(':').map(Number)
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
  }

  private statusColor(status: string) {
    return status === 'CONFIRMED' ? '#c8ff00' : status === 'CANCELLED' ? '#ff4d4d' : '#f5a623'
  }

  private buildBookingEmail(data: BookingEmailData): string {
    const statusBg   = this.statusColor(data.status)
    const statusText = data.status === 'CONFIRMED' ? '#000' : '#fff'
    const viewUrl    = `${data.appUrl}/bookings/${data.bookingId}`

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Booking Confirmation — PicklePro Courts</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Inter',Arial,Helvetica,sans-serif;">

  <!-- Email wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:#0a0a0a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;">

          <!-- ── Header ─────────────────────────────────────── -->
          <tr>
            <td style="padding-bottom:24px;" align="center">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#c8ff00;border-radius:50%;width:42px;height:42px;
                              text-align:center;vertical-align:middle;font-size:20px;
                              font-weight:700;color:#000;line-height:42px;">
                    P
                  </td>
                  <td style="padding-left:10px;font-size:18px;font-weight:700;
                              color:#ffffff;letter-spacing:0.5px;">
                    PicklePro Courts
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Card ──────────────────────────────────────── -->
          <tr>
            <td style="background:#111111;border-radius:12px;overflow:hidden;
                        border:1px solid #222222;">

              <!-- Card header bar -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#c8ff00;padding:6px 0;"></td>
                </tr>
              </table>

              <!-- Card body -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="padding:32px 36px;">

                <!-- Greeting -->
                <tr>
                  <td style="padding-bottom:8px;">
                    <span style="font-size:13px;color:#888888;text-transform:uppercase;
                                 letter-spacing:1.5px;font-weight:600;">
                      Booking ${data.status === 'CONFIRMED' ? 'Confirmed' : data.status === 'CANCELLED' ? 'Cancelled' : 'Received'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:24px;">
                    <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;
                               line-height:1.2;">
                      Hey ${data.username},<br/>
                      ${data.status === 'CONFIRMED'
                        ? 'your court is booked!'
                        : data.status === 'CANCELLED'
                          ? 'your booking has been cancelled.'
                          : 'your booking is awaiting confirmation.'}
                    </h1>
                  </td>
                </tr>

                <!-- Status badge -->
                <tr>
                  <td style="padding-bottom:28px;">
                    <span style="display:inline-block;background:${statusBg};color:${statusText};
                                 font-size:11px;font-weight:700;letter-spacing:1.5px;
                                 text-transform:uppercase;padding:5px 14px;border-radius:20px;">
                      ${data.status}
                    </span>
                  </td>
                </tr>

                <!-- Divider -->
                <tr><td style="border-top:1px solid #222222;padding-bottom:28px;"></td></tr>

                <!-- Booking summary -->
                <tr>
                  <td style="padding-bottom:20px;">
                    <span style="font-size:11px;color:#888888;text-transform:uppercase;
                                 letter-spacing:1.5px;font-weight:600;">
                      Booking Details
                    </span>
                  </td>
                </tr>

                <!-- Detail rows -->
                ${this.detailRow('Booking ID', `#${data.bookingId}`)}
                ${this.detailRow('Court', `${data.courtName} — ${data.courtIndoor ? 'Indoor' : 'Outdoor'}`)}
                ${this.detailRow('Court Number', `Court ${data.courtNumber}`)}
                ${this.detailRow('Date', this.fmtDate(data.bookingDate))}
                ${this.detailRow('Time Slot', `${this.fmtTime(data.startTime)} – ${this.fmtTime(data.endTime)}`)}
                ${this.detailRow('Amount Due', `₱${data.totalAmount}`)}
                ${this.detailRow('Payment', data.status === 'PENDING'
                    ? 'Awaiting payment — upload GCash receipt to confirm'
                    : data.status === 'CONFIRMED' ? 'Payment confirmed' : '—')}

                <!-- Divider -->
                <tr><td style="border-top:1px solid #222222;padding-bottom:28px;"></td></tr>

                <!-- Venue info -->
                <tr>
                  <td style="padding-bottom:20px;">
                    <span style="font-size:11px;color:#888888;text-transform:uppercase;
                                 letter-spacing:1.5px;font-weight:600;">
                      Venue Information
                    </span>
                  </td>
                </tr>
                ${this.detailRow('Location', data.courtLocation || '—')}
                ${this.detailRow('Contact', data.courtContact  || '—')}

                <!-- Divider -->
                <tr><td style="border-top:1px solid #222222;padding-bottom:28px;"></td></tr>

                <!-- CTA button -->
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <a href="${viewUrl}"
                       style="display:inline-block;background:#c8ff00;color:#000000;
                              font-size:14px;font-weight:700;text-decoration:none;
                              padding:14px 36px;border-radius:6px;letter-spacing:0.5px;">
                      View Booking
                    </a>
                  </td>
                </tr>

                <!-- Support note -->
                <tr>
                  <td style="text-align:center;padding-bottom:8px;">
                    <p style="margin:0;font-size:13px;color:#666666;line-height:1.6;">
                      Questions? Reply to this email or contact venue support at<br/>
                      <a href="mailto:${data.courtContact}"
                         style="color:#c8ff00;text-decoration:none;">${data.courtContact}</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- ── Footer ─────────────────────────────────────── -->
          <tr>
            <td style="padding-top:32px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#444444;">
                © ${new Date().getFullYear()} PicklePro Courts. All rights reserved.
              </p>
              <p style="margin:0;font-size:12px;color:#333333;">
                You received this email because you made a booking on PicklePro Courts.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
  }

  private detailRow(label: string, value: string): string {
    return `
      <tr>
        <td style="padding-bottom:16px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="40%" style="font-size:12px;color:#666666;text-transform:uppercase;
                                      letter-spacing:0.8px;font-weight:600;vertical-align:top;
                                      padding-right:12px;">
                ${label}
              </td>
              <td width="60%" style="font-size:14px;color:#e0e0e0;font-weight:500;
                                      vertical-align:top;">
                ${value}
              </td>
            </tr>
          </table>
        </td>
      </tr>`
  }
}

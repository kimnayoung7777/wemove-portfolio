package kr.co.iei.auth.model.service;

import jakarta.mail.internet.MimeMessage;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;
import kr.co.iei.auth.model.dao.AuthDao;
import kr.co.iei.auth.model.vo.EmailVerificationEvent;
import kr.co.iei.auth.model.vo.EmailVerificationSendResponse;
import kr.co.iei.common.exception.DuplicateResourceException;
import kr.co.iei.common.websocket.WebSocketMessageBroadcaster;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailVerificationServiceImpl implements EmailVerificationService {
  private static final String VERIFY_TOKEN_KEY_PREFIX = "auth:email-verify-token:";
  private static final String VERIFIED_EMAIL_KEY_PREFIX = "auth:email-verified:";
  private static final String DEFAULT_PURPOSE = "DEFAULT";
  private static final String FIND_LOGIN_ID_PURPOSE = "FIND_LOGIN_ID";
  private static final String RESET_PASSWORD_PURPOSE = "RESET_PASSWORD";
  private static final Duration TOKEN_TTL = Duration.ofMinutes(15);
  private static final Duration VERIFIED_TTL = Duration.ofMinutes(30);
  private static final URI EMAILJS_SEND_URI =
      URI.create("https://api.emailjs.com/api/v1.0/email/send");

  private final AuthDao authDao;
  private final StringRedisTemplate stringRedisTemplate;
  private final WebSocketMessageBroadcaster webSocketMessageBroadcaster;
  private final ObjectProvider<JavaMailSender> mailSenderProvider;
  private final HttpClient httpClient = HttpClient.newHttpClient();

  @Value("${wemove.email.verification-base-url:http://localhost:8456/api/auth/email/verify}")
  private String verificationBaseUrl;

  @Value("${wemove.email.from:no-reply@wemove.local}")
  private String fromEmail;

  @Value("${emailjs.service.id:}")
  private String emailjsServiceId;

  @Value("${emailjs.template.id:}")
  private String emailjsTemplateId;

  @Value("${emailjs.public.key:}")
  private String emailjsPublicKey;

  @Value("${emailjs.private.key:}")
  private String emailjsPrivateKey;

  @Override
  public EmailVerificationSendResponse sendVerificationEmail(String email) {
    String normalizedEmail = normalizeEmail(email);

    if (authDao.selectByEmail(normalizedEmail) != null) {
      throw new DuplicateResourceException("이미 사용 중인 이메일입니다.");
    }

    return sendVerification(normalizedEmail, DEFAULT_PURPOSE);
  }

  @Override
  public EmailVerificationSendResponse sendAccountRecoveryEmail(String email, String purpose) {
    String normalizedEmail = normalizeEmail(email);
    String normalizedPurpose = normalizePurpose(purpose);

    if (authDao.selectByEmail(normalizedEmail) == null) {
      throw new IllegalArgumentException("가입된 이메일이 없습니다.");
    }

    return sendVerification(normalizedEmail, normalizedPurpose);
  }

  private EmailVerificationSendResponse sendVerification(String normalizedEmail, String purpose) {
    String token = UUID.randomUUID().toString();
    String verificationUrl = verificationBaseUrl + "?token=" + token;

    stringRedisTemplate
            .opsForValue()
            .set(tokenKey(token), purpose + "|" + normalizedEmail, TOKEN_TTL);

    sendMailIfAvailable(normalizedEmail, verificationUrl);

    return new EmailVerificationSendResponse("인증 메일이 발송되었습니다.", verificationUrl);
  }

  @Override
  public String verify(String token) {
    if (token == null || token.isBlank()) {
      throw new IllegalArgumentException("이메일 인증 토큰이 없습니다.");
    }

    String tokenValue = stringRedisTemplate.opsForValue().get(tokenKey(token));
    if (tokenValue == null || tokenValue.isBlank()) {
      throw new IllegalArgumentException("이메일 인증 링크가 만료되었거나 올바르지 않습니다.");
    }

    String[] tokenParts = tokenValue.split("\\|", 2);
    String purpose = tokenParts.length == 2 ? tokenParts[0] : DEFAULT_PURPOSE;
    String email = tokenParts.length == 2 ? tokenParts[1] : tokenValue;

    stringRedisTemplate.delete(tokenKey(token));
    stringRedisTemplate.opsForValue().set(verifiedKey(email, purpose), "true", VERIFIED_TTL);
    webSocketMessageBroadcaster.broadcast(new EmailVerificationEvent("EMAIL_VERIFIED", email, true));
    return email;
  }

  @Override
  public boolean isVerified(String email) {
    String normalizedEmail = normalizeEmail(email);
    return "true".equals(
        stringRedisTemplate.opsForValue().get(verifiedKey(normalizedEmail, DEFAULT_PURPOSE)));
  }

  @Override
  public boolean isVerified(String email, String purpose) {
    String normalizedEmail = normalizeEmail(email);
    String normalizedPurpose = normalizePurpose(purpose);
    return "true".equals(
        stringRedisTemplate.opsForValue().get(verifiedKey(normalizedEmail, normalizedPurpose)));
  }

  private void sendMailIfAvailable(String email, String verificationUrl) {
    if (isEmailJsConfigured()) {
      sendMailWithEmailJs(email, verificationUrl);
      return;
    }

    JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
    if (mailSender == null) {
      return;
    }

    try {
      MimeMessage message = mailSender.createMimeMessage();
      MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
      helper.setFrom(fromEmail, "WeMove");
      helper.setTo(email);
      helper.setSubject("[WeMove] 이메일 인증을 완료해주세요");
      helper.setText(buildMailHtml(verificationUrl), true);
      mailSender.send(message);
    } catch (Exception e) {
      throw new IllegalStateException("Email delivery failed. Check SMTP settings.", e);
    }
  }

  private boolean isEmailJsConfigured() {
    return hasText(emailjsServiceId) && hasText(emailjsTemplateId) && hasText(emailjsPublicKey);
  }

  private void sendMailWithEmailJs(String email, String verificationUrl) {
    String accessTokenField =
        hasText(emailjsPrivateKey)
            ? """
              "accessToken": "%s",
        """
                .formatted(escapeJson(emailjsPrivateKey.trim()))
            : "";
    String body =
        """
        {
          "service_id": "%s",
          "template_id": "%s",
          "user_id": "%s",
          %s
          "template_params": {
            "to_email": "%s",
            "to_name": "%s",
            "from_name": "WeMove",
            "subject": "WeMove email verification",
            "verification_url": "%s",
            "message_html": "%s"
          }
        }
        """
            .formatted(
                escapeJson(emailjsServiceId.trim()),
                escapeJson(emailjsTemplateId.trim()),
                escapeJson(emailjsPublicKey.trim()),
                accessTokenField,
                escapeJson(email),
                escapeJson(email),
                escapeJson(verificationUrl),
                escapeJson(buildMailHtml(verificationUrl)));

    HttpRequest request =
        HttpRequest.newBuilder(EMAILJS_SEND_URI)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();

    try {
      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString());

      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw new IllegalStateException(
            "EmailJS delivery failed: HTTP "
                + response.statusCode()
                + " "
                + response.body());
      }
    } catch (IOException e) {
      throw new IllegalStateException("EmailJS delivery failed.", e);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("EmailJS delivery was interrupted.", e);
    }
  }

  private String buildMailHtml(String verificationUrl) {
    return """
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#10233f">
          <h2>WeMove 이메일 인증</h2>
          <p>아래 버튼을 눌러 이메일 인증을 완료해주세요.</p>
          <p>
            <a href="%s" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:10px;font-weight:700">
              인증하기
            </a>
          </p>
          <p>버튼이 열리지 않으면 아래 주소를 브라우저에 붙여넣어 주세요.</p>
          <p>%s</p>
        </div>
        """
            .formatted(verificationUrl, verificationUrl);
  }

  private String normalizeEmail(String email) {
    if (email == null || email.isBlank()) {
      throw new IllegalArgumentException("이메일을 입력해주세요.");
    }

    return email.trim().toLowerCase();
  }

  private String normalizePurpose(String purpose) {
    String normalizedPurpose = purpose == null ? "" : purpose.trim().toUpperCase();
    if (FIND_LOGIN_ID_PURPOSE.equals(normalizedPurpose)
        || RESET_PASSWORD_PURPOSE.equals(normalizedPurpose)) {
      return normalizedPurpose;
    }

    throw new IllegalArgumentException("이메일 인증 목적이 올바르지 않습니다.");
  }

  private String tokenKey(String token) {
    return VERIFY_TOKEN_KEY_PREFIX + token;
  }

  private String verifiedKey(String email, String purpose) {
    return VERIFIED_EMAIL_KEY_PREFIX + purpose + ":" + email;
  }

  private boolean hasText(String value) {
    return value != null && !value.isBlank();
  }

  private String escapeJson(String value) {
    if (value == null) {
      return "";
    }

    StringBuilder escaped = new StringBuilder();
    for (int i = 0; i < value.length(); i++) {
      char ch = value.charAt(i);
      switch (ch) {
        case '\\' -> escaped.append("\\\\");
        case '"' -> escaped.append("\\\"");
        case '\b' -> escaped.append("\\b");
        case '\f' -> escaped.append("\\f");
        case '\n' -> escaped.append("\\n");
        case '\r' -> escaped.append("\\r");
        case '\t' -> escaped.append("\\t");
        default -> escaped.append(ch);
      }
    }
    return escaped.toString();
  }
}

<?php
/**
 * Learn Tilawah — Free Trial form handler
 * -------------------------------------------------------------------
 * Sends the booking form via SMTP using PHPMailer.
 *
 * SET-UP (do this once on the server):
 *   1) Install PHPMailer, either with Composer:
 *          composer require phpmailer/phpmailer
 *      ...or by dropping its /src folder into  php/PHPMailer/src
 *   2) Replace the DUMMY values in the CONFIG block below with the real
 *      SMTP host, username, password and recipient address.
 *
 * Until real SMTP details are added, submissions still validate and the
 * front-end shows a friendly confirmation.
 * -------------------------------------------------------------------
 */

header('Content-Type: application/json; charset=utf-8');

/* ----------------------------- CONFIG ----------------------------- */
/* ⚠️ DUMMY VALUES — replace before going live. */
$CONFIG = [
    'smtp_host'   => 'smtp.example.com',          // e.g. smtp.hostinger.com
    'smtp_user'   => 'noreply@learntilawah.com',  // mailbox that sends
    'smtp_pass'   => 'CHANGE_ME_SMTP_PASSWORD',    // mailbox password / app key
    'smtp_port'   => 465,                          // 465 (SSL) or 587 (TLS)
    'smtp_secure' => 'ssl',                         // 'ssl' or 'tls'
    'from_email'  => 'noreply@learntilawah.com',
    'from_name'   => 'Learn Tilawah Website',
    'to_email'    => 'info@learntilawah.com',       // where leads are received
    'to_name'     => 'Learn Tilawah',
];
/* ------------------------------------------------------------------ */

function respond($ok, $message = '', $code = 200) {
    http_response_code($code);
    echo json_encode(['ok' => $ok, 'message' => $message]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Invalid request method.', 405);
}

/* ------------------------- collect + clean ------------------------ */
function clean($key) {
    return isset($_POST[$key]) ? trim(strip_tags($_POST[$key])) : '';
}

$fullName      = clean('fullName');
$email         = clean('email');
$phone         = clean('phone');
$age           = clean('age');
$course        = clean('course');
$preferredTime = clean('preferredTime');
$notes         = clean('notes');

/* simple honeypot (add a hidden field named "website" to enable) */
if (!empty($_POST['website'])) {
    respond(true, 'Received.'); // silently drop bots
}

/* ----------------------------- validate --------------------------- */
$errors = [];
if ($fullName === '')                                  $errors[] = 'Full name is required.';
if (!filter_var($email, FILTER_VALIDATE_EMAIL))        $errors[] = 'A valid email address is required.';
if ($phone === '')                                     $errors[] = 'A phone or WhatsApp number is required.';
if ($age === '' || !is_numeric($age))                  $errors[] = 'A valid student age is required.';
if ($course === '')                                    $errors[] = 'Please choose a course.';

if ($errors) {
    respond(false, implode(' ', $errors), 422);
}

/* --------------------------- build email -------------------------- */
$subject = 'New Free Trial Request — ' . $fullName;

$bodyHtml =
    '<h2 style="font-family:Arial,sans-serif;color:#0C5C45;">New Free Trial Request</h2>' .
    '<table cellpadding="8" style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse;">' .
    row('Full name', $fullName) .
    row('Email', $email) .
    row('Phone / WhatsApp', $phone) .
    row('Student age', $age) .
    row('Course required', $course) .
    row('Preferred time', $preferredTime ?: '—') .
    row('Additional info', nl2br($notes) ?: '—') .
    '</table>';

$bodyText =
    "New Free Trial Request\n\n" .
    "Full name: $fullName\n" .
    "Email: $email\n" .
    "Phone/WhatsApp: $phone\n" .
    "Student age: $age\n" .
    "Course: $course\n" .
    "Preferred time: " . ($preferredTime ?: '-') . "\n" .
    "Additional info: " . ($notes ?: '-') . "\n";

function row($label, $value) {
    return '<tr><td style="border:1px solid #E4DBC7;font-weight:bold;">' . htmlspecialchars($label) .
           '</td><td style="border:1px solid #E4DBC7;">' . $value . '</td></tr>';
}

/* ----------------------- locate PHPMailer ------------------------- */
$loaded = false;
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require __DIR__ . '/vendor/autoload.php';
    $loaded = class_exists('\PHPMailer\PHPMailer\PHPMailer');
} elseif (file_exists(__DIR__ . '/PHPMailer/src/PHPMailer.php')) {
    require __DIR__ . '/PHPMailer/src/Exception.php';
    require __DIR__ . '/PHPMailer/src/PHPMailer.php';
    require __DIR__ . '/PHPMailer/src/SMTP.php';
    $loaded = class_exists('\PHPMailer\PHPMailer\PHPMailer');
}

/* ----------------------------- send ------------------------------- */
if ($loaded) {
    $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = $CONFIG['smtp_host'];
        $mail->SMTPAuth   = true;
        $mail->Username   = $CONFIG['smtp_user'];
        $mail->Password   = $CONFIG['smtp_pass'];
        $mail->SMTPSecure = $CONFIG['smtp_secure'];
        $mail->Port       = (int) $CONFIG['smtp_port'];
        $mail->CharSet    = 'UTF-8';

        $mail->setFrom($CONFIG['from_email'], $CONFIG['from_name']);
        $mail->addAddress($CONFIG['to_email'], $CONFIG['to_name']);
        $mail->addReplyTo($email, $fullName);

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $bodyHtml;
        $mail->AltBody = $bodyText;

        $mail->send();
        respond(true, 'Your free trial request has been sent.');
    } catch (\Exception $e) {
        // Avoid leaking server details to the client.
        respond(false, 'We could not send your request just now. Please email info@learntilawah.com.', 500);
    }
} else {
    /* Fallback: native mail() so the form works before PHPMailer is set up. */
    $headers  = 'MIME-Version: 1.0' . "\r\n";
    $headers .= 'Content-type: text/html; charset=UTF-8' . "\r\n";
    $headers .= 'From: ' . $CONFIG['from_name'] . ' <' . $CONFIG['from_email'] . '>' . "\r\n";
    $headers .= 'Reply-To: ' . $email . "\r\n";

    if (@mail($CONFIG['to_email'], $subject, $bodyHtml, $headers)) {
        respond(true, 'Your free trial request has been sent.');
    } else {
        respond(false, 'Mail is not configured on the server yet. Please email info@learntilawah.com.', 500);
    }
}

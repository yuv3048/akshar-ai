import VerificationOtpEmail from "../src/templates/VerificationOtpEmail";


export default function VerificationOtpEmailPreview() {
  return (
    <VerificationOtpEmail
      verificationCode="596853"
      verificationUrl="http://localhost:3000/verify-email"
      logoUrl="https://res.cloudinary.com/icf0ttng/image/upload/v1790495747/logo.png"
    />
  );
}
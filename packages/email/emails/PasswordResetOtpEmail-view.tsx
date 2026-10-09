import  PasswordResetOtpEmail  from "../src/templates/PasswordResetOtpEmail";

export default function PasswordResetOtpEmailPreview() {
  return (
    <PasswordResetOtpEmail
      verificationCode= "596853"
      resetUrl= "http://localhost:3000/reset-password"
      logoUrl=
        "https://res.cloudinary.com/icf0ttng/image/upload/v1790495747/logo.png"
    />
  )
};
import  WelcomeEmail  from "../src/templates/WelcomeEmail";

export default function Preview() {
  return (
    <WelcomeEmail
      logoUrl="https://res.cloudinary.com/icf0ttng/image/upload/v1790495747/logo.png"
      appUrl="https://akshar.example.com/verify-email"
      fname = "Yuvraj"
    />
  );
}


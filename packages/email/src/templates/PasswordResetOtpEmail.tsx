
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "react-email";

import { barebonesBoxedTailwindConfig } from "../theme";
import { BarebonesFonts } from "../theme-fonts";

type PasswordResetOtpEmailProps = {
  verificationCode: string;
  resetUrl: string;
  logoUrl: string;
};

export const PasswordResetOtpEmail = ({
  verificationCode,
  resetUrl,
  logoUrl,
}: PasswordResetOtpEmailProps) => (
  <Tailwind config={barebonesBoxedTailwindConfig}>
    <Html>
      <Head>
        <BarebonesFonts />
      </Head>

      <Body className="bg-bg-2 m-0 text-center font-sans">
        <Preview>
          Your Akshar AI password reset code.
        </Preview>

        <Container className="mobile:mt-0 mx-auto mt-8 w-full max-w-[640px]">
          <Section>
            {/* Main email container */}
            <Section className="bg-bg mobile:px-2 px-6 py-4">

              {/* Header */}
              <Section className="mb-3 px-6">
                <Row>
                  <Column className="w-1/2 py-[7px] align-middle">
                    <Img
                      src={logoUrl}
                      alt="Akshar AI"
                      width={23}
                      height={23}
                      className="block rounded-[5px]"
                    />
                  </Column>

                  <Column
                    align="right"
                    className="w-1/2 py-[7px] align-middle"
                  >
                    <Text className="font-13 m-0 text-right font-sans">
                      <span className="text-fg-3">Akshar AI</span>
                    </Text>
                  </Column>
                </Row>
              </Section>

              {/* Main content */}
              <Section className="bg-bg-2 mobile:px-6 mobile:py-12 rounded-[8px] px-[40px] py-[64px] text-center">

                <Section className="mb-3">

                  <Heading
                    as="h1"
                    className="font-28 text-fg m-0 font-sans"
                  >
                    Reset your password
                  </Heading>
                </Section>

                <Text className="font-16 text-fg-2 mx-auto mt-0 mb-8 max-w-[380px] text-center font-sans">
                  We received a request to reset the password for your Akshar
                  AI account. Use the verification code below to continue.
                </Text>

                <Text className="font-16 text-fg-2 mx-auto mt-0 mb-8 max-w-[380px] text-center font-sans">
                  Enter this code on the password reset page to verify your
                  request and create a new password.
                </Text>

                {/* Verification code */}
                <Section className="text-center">
                  <Text className="font-13 text-fg-3 m-0 text-center font-sans">
                    Password reset code
                  </Text>

                  <Text className="text-fg m-0 mt-[10px] mb-[10px] text-center font-sans text-[36px] font-[600] tracking-[8px]">
                    {verificationCode}
                  </Text>

                  <Text className="font-13 text-fg-3 m-0 text-center font-sans">
                    This code is valid for 15 minutes.
                  </Text>
                </Section>

                {/* CTA */}
                <Section className="mb-6 mt-8 text-center">
                  <Button
                    href={resetUrl}
                    className="bg-fg font-16 text-fg-inverted inline-block rounded-lg px-7 py-4 text-center font-sans leading-6 no-underline"
                  >
                    Continue to password reset
                  </Button>
                </Section>

                <Text className="font-13 text-fg-3 mx-auto mt-8 mb-0 max-w-[400px] text-center font-sans">
                  Clicking the button will take you to the password reset
                  page. Your password will only be changed after you
                  successfully verify the code and choose a new password.
                </Text>
              </Section>

              {/* Security note */}
              <Section className="bg-bg">
                <Row>
                  <Column className="px-6 py-10 text-center">
                    <Text className="font-14 text-fg-2 mx-auto mt-0 mb-0 max-w-[420px] text-center font-sans">
                      If you didn&apos;t request a password reset, you can
                      safely ignore this email. Never share this verification
                      code with anyone.
                    </Text>
                  </Column>
                </Row>
              </Section>

              {/* Footer */}
              <Section className="bg-bg">
                <Row>
                  <Column className="px-6 py-10 text-center">
                    <Text className="font-13 text-fg-3 mx-auto mt-0 mb-8 max-w-[360px] text-center font-sans">
                      Akshar AI brings intelligent agents, tools, and
                      workflows together in one place.
                    </Text>

                    <Text className="font-11 text-fg-3 m-0 text-center font-sans">
                      This is an automated email from Akshar AI. Please do not
                      reply to this email.
                    </Text>
                  </Column>
                </Row>
              </Section>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  </Tailwind>
);

export default PasswordResetOtpEmail;


import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
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

type VerificationOtpEmailProps = {
  verificationCode: string;
  logoUrl: string;
  verificationUrl: string;
};

export const VerificationOtpEmail = ({
  verificationCode,
  logoUrl,
  verificationUrl,
}: VerificationOtpEmailProps) => (
  <Tailwind config={barebonesBoxedTailwindConfig}>
    <Html>
      <Head>
        <BarebonesFonts />
      </Head>

      <Body className="bg-bg-2 m-0 text-center font-sans">
        <Preview>
          Your Akshar AI verification code.
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

              {/* Main verification card */}
              <Section className="bg-bg-2 mobile:px-6 mobile:py-12 rounded-[8px] px-[40px] py-[64px] text-center">
                {/* Logo */}
                <Section className="mb-3">

                  <Heading
                    as="h1"
                    className="font-28 text-fg m-0 font-sans"
                  >
                    Verify your email
                  </Heading>
                </Section>

                {/* Introduction */}
                <Text className="font-16 text-fg-2 mx-auto mt-0 mb-8 max-w-[400px] text-center font-sans">
                  Welcome to Akshar AI. You&apos;re one step away from
                  creating your account. We just need to confirm that this
                  email address belongs to you.
                </Text>

                <Text className="font-16 text-fg-2 mx-auto mt-0 mb-8 max-w-[400px] text-center font-sans">
                  Enter the verification code below to confirm your email
                  address and finish creating your Akshar AI account.
                </Text>

                {/* Verification code */}
                <Section className="text-center">
                  <Text className="font-13 text-fg-3 m-0 text-center font-sans">
                    Verification code
                  </Text>

                  <Text className="text-fg m-0 mt-[10px] mb-[10px] text-center font-sans text-[36px] font-[600] tracking-[8px]">
                    {verificationCode}
                  </Text>

                  <Text className="font-13 text-fg-3 m-0 text-center font-sans">
                    This code is valid for 7 minutes.
                  </Text>
                </Section>

                {/* CTA */}
                <Section className="mb-6 mt-8 text-center">
                  <Button
                    href={verificationUrl}
                    className="bg-fg font-16 text-fg-inverted inline-block rounded-lg px-7 py-4 text-center font-sans leading-6 no-underline"
                  >
                    Continue to verification
                  </Button>
                </Section>

                {/* Signup window */}
                <Text className="font-13 text-fg-3 mx-auto mt-8 mb-0 max-w-[420px] text-center font-sans">
                  Please verify your email within 1 hour to complete your
                  signup.
                </Text>
              </Section>

              {/* Security note */}
              <Section className="bg-bg">
                <Row>
                  <Column className="px-6 py-10">
                    <Text className="font-14 text-fg-2 m-0 text-center font-sans">
                      If you didn&apos;t create an Akshar AI account, you can
                      safely ignore this email. Never share your verification
                      code with anyone.
                    </Text>
                  </Column>
                </Row>
              </Section>

              <Hr className="border-stroke m-0" />

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

export default VerificationOtpEmail;

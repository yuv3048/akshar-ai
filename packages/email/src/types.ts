export type EMAILJOB = 
    | {
        type: "WELCOME_EMAIL";
        email: string;
        fname: string;
      }
    | {
        type: "VERIFY_EMAIL";
        email: string;
        otp: string;
        }
    |  {
        type: "PASSWORD_RESET";
        email: string;
        otp: string;
        };




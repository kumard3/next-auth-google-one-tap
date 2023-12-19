/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { useEffect, useState } from "react";
import { useSession, signIn, SignInOptions } from "next-auth/react";
import { env } from "~/env";

interface OneTapSigninOptions {
  parentContainerId?: string;
}

const useOneTapSignin = (
  opt?: OneTapSigninOptions & Pick<SignInOptions, "redirect" | "callbackUrl">,
) => {
  const { status } = useSession();
  const isSignedIn = status === "authenticated";
  const { parentContainerId } = opt ?? {};
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !isSignedIn) {
      //@ts-ignore need to add google to window
      const { google } = window;
      if (google) {
        google.accounts.id.initialize({
          client_id: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: async (response: { credential: string }) => {
            setIsLoading(true);

            // Here we call our Provider with the token provided by google
            await signIn("googleonetap", {
              credential: response.credential,
              redirect: true,
              ...opt,
            });
            setIsLoading(false);
          },
          prompt_parent_id: parentContainerId,
          style:
            "position: absolute; top: 100px; right: 30px;width: 0; height: 0; z-index: 1001;",
        });

        // Here we just console.log some error situations and reason why the google one tap
        // is not displayed. You may want to handle it depending on yuor application
        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed()) {
            console.log(notification.getNotDisplayedReason());
          } else if (notification.isSkippedMoment()) {
            console.log(notification.getSkippedReason());
          } else if (notification.isDismissedMoment()) {
            console.log(notification.getDismissedReason());
          }
        });
      }
    }
  }, [isLoading, isSignedIn, parentContainerId]);

  return { isLoading };
};

export default useOneTapSignin;

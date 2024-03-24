import { useState } from "react";
import { useSession, signIn, type SignInOptions } from "next-auth/react";

import {
  type CredentialResponse,
  type PromptMomentNotification,
} from "google-one-tap";

interface OneTapSigninOptions {
  parentContainerId?: string;
}

const useOneTapSignin = (
  options?: OneTapSigninOptions &
    Pick<SignInOptions, "redirect" | "callbackUrl">,
) => {
  const { parentContainerId } = options ?? {};
  const [isLoading, setIsLoading] = useState(false);

  // Taking advantage in recent development of useSession hook.
  // If user is unauthenticated, google one tap ui is initialized and rendered
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      if (!isLoading) {
        const { google } = window;
        if (google) {
          google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
            // auto_select: true, // TODO: Uncomment this line if you want to skip the one tap UI
            callback: (response: CredentialResponse) => {
              setIsLoading(true);

              // Here we call our Provider with the token provided by google
              void signIn("googleonetap", {
                credential: response.credential,
                redirect: true,
                ...options,
              });
              setIsLoading(false);
            },
            prompt_parent_id: parentContainerId,
          });

          // Here we just console.log some error situations and reason why the google one tap
          // is not displayed. You may want to handle it depending on yuor application
          google.accounts.id.prompt(
            (notification: PromptMomentNotification) => {
              if (notification.isNotDisplayed()) {
                console.log(
                  "getNotDisplayedReason ::",
                  notification.getNotDisplayedReason(),
                );
              } else if (notification.isSkippedMoment()) {
                console.log(
                  "getSkippedReason  ::",
                  notification.getSkippedReason(),
                );
              } else if (notification.isDismissedMoment()) {
                console.log(
                  "getDismissedReason ::",
                  notification.getDismissedReason(),
                );
              }
            },
          );
        }
      }
    },
  });

  return { isLoading, status };
};

export default useOneTapSignin;

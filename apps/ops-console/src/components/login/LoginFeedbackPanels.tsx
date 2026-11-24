type LoginFeedbackPanelsProps = {
  signInError: string | null;
};

function FeedbackPanel({
  testId,
  message,
}: {
  testId: string;
  message: string;
}) {
  return (
    <div
      data-testid={testId}
      role="alert"
      className="mt-4 rounded-md border border-[#e7c2be] border-l-4 border-l-[#b93a36] bg-[#fff8f7] px-3.5 py-2.5 text-xs text-[#8f302a]"
    >
      {message}
    </div>
  );
}

export function LoginFeedbackPanels({ signInError }: LoginFeedbackPanelsProps) {
  if (!signInError) {
    return null;
  }

  return (
    <div className="space-y-3">
      {signInError ? <FeedbackPanel testId="login-signin-error" message={signInError} /> : null}
    </div>
  );
}

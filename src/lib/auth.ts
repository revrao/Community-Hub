export function safeNext(value: string | null | undefined) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !/[\u0000-\u0020\u007f]/.test(value)
    ? value
    : "/profile";
}
export function databaseMessage(message: string) {
  if (
    /schema cache|does not exist|could not find|permission denied for schema/i.test(
      message,
    )
  )
    return "Database setup is not complete. Apply the CommunityHub migrations, then try again.";
  return "Unable to load CommunityHub data. Please try again or check the database connection.";
}

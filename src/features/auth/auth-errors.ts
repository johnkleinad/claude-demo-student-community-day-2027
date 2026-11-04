export function authErrorMessage(cause: unknown) {
  const name = cause instanceof Error ? cause.name : ''
  const messages: Record<string, string> = {
    NotAuthorizedException: 'El correo o la contraseña no son correctos. Inténtalo otra vez.',
    UserNotFoundException: 'El correo o la contraseña no son correctos. Inténtalo otra vez.',
    UsernameExistsException: 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.',
    UserNotConfirmedException: 'Confirma tu correo con el código que recibiste antes de entrar.',
    CodeMismatchException: 'El código no es correcto. Revísalo e inténtalo otra vez.',
    ExpiredCodeException: 'El código venció. Solicita uno nuevo.',
    InvalidPasswordException: 'La contraseña no cumple los requisitos indicados.',
    PasswordHistoryPolicyViolationException: 'Elige una contraseña que no hayas usado antes.',
    LimitExceededException: 'Se alcanzó el límite de intentos. Espera unos minutos.',
    TooManyRequestsException: 'Hay demasiados intentos. Espera un momento antes de continuar.',
    NetworkError: 'No pudimos conectar. Revisa tu conexión e inténtalo otra vez.',
    PasswordResetRequiredException: 'Necesitas restablecer tu contraseña para continuar.',
    SignInException: 'El intento de acceso venció. Vuelve a iniciar sesión.',
  }
  return messages[name] ?? 'No pudimos completar la solicitud. Revisa tu conexión e inténtalo otra vez.'
}

export function isAnonymousError(cause: unknown) {
  return cause instanceof Error && ['UserUnAuthenticatedException', 'NotAuthorizedException', 'UserNotFoundException'].includes(cause.name)
}

export function safeReturnTo(value: unknown) {
  return typeof value === 'string' && /^\/(?:decks\/(?:new|[a-zA-Z0-9_-]+))?$/.test(value) ? value : '/'
}

import { CustomAuthorizerEvent, CustomAuthorizerResult } from 'aws-lambda'
import 'source-map-support/register'
import { verify } from 'jsonwebtoken'
import { createLogger } from '../../utils/logger'
import { JwtPayload } from '../../auth/JwtPayload'

const logger = createLogger('auth')


const cert = `-----BEGIN CERTIFICATE-----
MIIDBzCCAe+gAwIBAgIJT/q72B8iBY4MMA0GCSqGSIb3DQEBCwUAMCExHzAdBgNV
BAMTFmRldi1lZmRjN3EwNS5hdXRoMC5jb20wHhcNMTkxMjA3MDg0NTE4WhcNMzMw
ODE1MDg0NTE4WjAhMR8wHQYDVQQDExZkZXYtZWZkYzdxMDUuYXV0aDAuY29tMIIB
IjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtY7ZnfZh95H1U89m9MMTpYCt
NlGhKSkhbvieghMW2W1w65a49wQzKv8lcnqT1yxFzY+dlVJ6EZvq3ZBsWxxMO9fc
PZjqPnLsdp6Y4gQY8b/twOxsz686yAIVY1NxPgnyG6N5WDxn6lbAQbVjhBnqGY6b
BLKftiVyMoAG2l1eiq8zIrZxp5PzGTbWeTwDKzxSvjWRHntzibpifQHqnd7dqesS
yyHAX+dWwNusvjg9BY3gvWBKR40LRnYMFnWRHc22GBjMyeiArlPrlwjIzEo7SpSq
NVfZB/31zxVEFn7twvWQfRFAV0pWSTJKtsUrC7zVIP5M/f4PaBOrLWvPTw7t9wID
AQABo0IwQDAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBTol8ODODPhF183bkCI
im3AhDhBejAOBgNVHQ8BAf8EBAMCAoQwDQYJKoZIhvcNAQELBQADggEBACXktteX
BwJ3FIHSeimZP8iA0HcZtA+CvPfgfGwDOQV2vaClB1tqVy4kDnVCt+f+zmSFjIdW
TwJ4GMNFKd8JqGQPT2EEFjoIH7vFzrm1BMw2sYeBAatbiWs7KTxw6ohELZLNgL+c
a2Fgr3WkRsBvulJ3v7HkRXXu88z/GzAWn5AcfYmRk87pP2eJqb1bqujzdSd+uUrZ
pEPGAw7QlW3TvVy+0XVAh4iEkw/KsFS2T9uYjN9c+qYwvvoR8FWqgW21ETAOJAsy
flriGd1yJsKRGGkdI/rS03lmDHX8WOdlJ9NxfQtYkaKbq8VI8ovRqDFmuClJMHFC
jrms59VnHDPEPwg=
-----END CERTIFICATE-----
`


export const handler = async (
  event: CustomAuthorizerEvent
): Promise<CustomAuthorizerResult> => {
  logger.info('Authorizing a user', event.authorizationToken)
  try {
    const jwtToken = await verifyToken(event.authorizationToken)
    logger.info('User was authorized', jwtToken)

    return {
      principalId: jwtToken.sub,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: '*'
          }
        ]
      }
    }
  } catch (e) {
    logger.error('User not authorized', { error: e.message })

    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: '*'
          }
        ]
      }
    }
  }
}

async function verifyToken(authHeader: string): Promise<JwtPayload> {
  const token = getToken(authHeader)
  return verify(
    token,
    cert,
    { algorithms: ['RS256'] }
  ) as JwtPayload;
}

function getToken(authHeader: string): string {
  if (!authHeader) throw new Error('No authentication header')

  if (!authHeader.toLowerCase().startsWith('bearer '))
    throw new Error('Invalid authentication header')

  const split = authHeader.split(' ')
  const token = split[1]

  return token
}
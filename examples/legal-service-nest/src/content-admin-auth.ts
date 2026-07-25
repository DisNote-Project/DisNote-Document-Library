import {
  createParamDecorator,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";

interface AuthenticatedUser {
  sub: string;
  permissions?: string[];
}

interface AuthenticatedRequest {
  user?: AuthenticatedUser;
}

@Injectable()
export class ContentAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user?.sub) throw new UnauthorizedException("Authentication is required.");
    if (!request.user.permissions?.includes("content:admin")) {
      throw new ForbiddenException("The content:admin permission is required.");
    }
    return true;
  }
}

export const ContentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user?.sub) throw new UnauthorizedException("Authentication is required.");
    return request.user.sub;
  },
);

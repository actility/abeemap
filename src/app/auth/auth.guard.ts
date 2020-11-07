import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  Router,
} from '@angular/router';
import { Observable } from 'rxjs';

import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    actdRoute: ActivatedRouteSnapshot,
    rtrState: RouterStateSnapshot
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    if (
      'access_token' in actdRoute.queryParams &&
      'state' in actdRoute.queryParams &&
      this.authService.setSession(
        actdRoute.queryParams.access_token,
        actdRoute.queryParams.state
      )
    ) {
      const qp = Object.assign({}, actdRoute.queryParams);
      delete qp.access_token;
      delete qp.state;
      const urlTree = this.router.createUrlTree([], {
        queryParams: qp,
        fragment: actdRoute.fragment,
      });
      // { ..., queryParamsHandling: "merge", preserveFragment: true }
      return urlTree;
    } else if (this.authService.loggedIn) {
      return true;
    } else {
      if (actdRoute.queryParams.access_token || actdRoute.queryParams.state) {
        this.authService.login();
      } else {
        this.authService.login(window.location.href);
      }
      return false;
    }
  }
}

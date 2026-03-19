import { isServer } from '@growi/core/dist/utils';
import { Container } from 'unstated';

import loggerFactory from '~/utils/logger';
import { removeNullPropertyFromObject } from '~/utils/object-utils';

import { apiv3Get, apiv3Put } from '../util/apiv3-client';

const logger = loggerFactory('growi:security:AdminTraqSecurityContainer');

/**
 * Service container for admin security page (TraqSecuritySetting.jsx)
 * @extends {Container} unstated Container
 */
export default class AdminTraqSecurityContainer extends Container {
  constructor(appContainer) {
    super();

    if (isServer()) {
      return;
    }

    this.dummyTraqClientId = 0;
    this.dummyTraqClientIdForError = 1;

    this.state = {
      retrieveError: null,
      // set dummy value tile for using suspense
      traqIssuerHost: '',
      traqClientId: this.dummyTraqClientId,
      traqClientSecret: '',
      isSameUsernameTreatedAsIdenticalUser: false,
    };
  }

  /**
   * retrieve security data
   */
  async retrieveSecurityData() {
    try {
      const response = await apiv3Get('/security-setting/');
      const { traqOAuth } = response.data.securityParams;
      this.setState({
        traqIssuerHost: traqOAuth.traqIssuerHost,
        traqClientId: traqOAuth.traqClientId,
        traqClientSecret: traqOAuth.traqClientSecret,
        isSameUsernameTreatedAsIdenticalUser:
          traqOAuth.isSameUsernameTreatedAsIdenticalUser,
      });
    } catch (err) {
      this.setState({ retrieveError: err });
      logger.error(err);
      throw new Error('Failed to fetch data');
    }
  }

  /**
   * Workaround for the mangling in production build to break constructor.name
   */
  static getClassName() {
    return 'AdminTraqSecurityContainer';
  }

  /**
   * Switch isSameUsernameTreatedAsIdenticalUser
   */
  switchIsSameUsernameTreatedAsIdenticalUser() {
    this.setState({
      isSameUsernameTreatedAsIdenticalUser:
        !this.state.isSameUsernameTreatedAsIdenticalUser,
    });
  }

  /**
   * Update traqSetting
   */
  async updateTraqSetting(formData) {
    let requestParams =
      formData != null
        ? {
            traqIssuerHost: formData.traqIssuerHost,
            traqClientId: formData.traqClientId,
            traqClientSecret: formData.traqClientSecret,
            isSameUsernameTreatedAsIdenticalUser:
              formData.isSameUsernameTreatedAsIdenticalUser,
          }
        : {
            traqIssuerHost: this.state.traqIssuerHost,
            traqClientId: this.state.traqClientId,
            traqClientSecret: this.state.traqClientSecret,
            isSameUsernameTreatedAsIdenticalUser:
              this.state.isSameUsernameTreatedAsIdenticalUser,
          };

    requestParams = await removeNullPropertyFromObject(requestParams);
    const response = await apiv3Put(
      '/security-setting/traq-oauth',
      requestParams,
    );
    const { securitySettingParams } = response.data;

    this.setState({
      traqIssuerHost: securitySettingParams.traqIssuerHost,
      traqClientId: securitySettingParams.traqClientId,
      traqClientSecret: securitySettingParams.traqClientSecret,
      isSameUsernameTreatedAsIdenticalUser:
        securitySettingParams.isSameUsernameTreatedAsIdenticalUser,
    });
    return response;
  }
}

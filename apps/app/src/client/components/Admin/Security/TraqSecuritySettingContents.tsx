import { useCallback, useEffect } from 'react';
import { pathUtils } from '@growi/core/dist/utils';
import { useTranslation } from 'next-i18next';
import { useForm } from 'react-hook-form';
import urljoin from 'url-join';

import AdminGeneralSecurityContainer from '~/client/services/AdminGeneralSecurityContainer';
import AdminTraqSecurityContainer from '~/client/services/AdminTraqSecurityContainer';
import { toastError, toastSuccess } from '~/client/util/toastr';
import { useSiteUrlWithEmptyValueWarn } from '~/states/global';

import { withUnstatedContainers } from '../../UnstatedUtils';

type Props = {
  adminGeneralSecurityContainer: AdminGeneralSecurityContainer;
  adminTraqSecurityContainer: AdminTraqSecurityContainer;
};

const TraqSecuritySettingContents = (props: Props) => {
  const { adminGeneralSecurityContainer, adminTraqSecurityContainer } = props;

  const { t } = useTranslation('admin');
  const siteUrl = useSiteUrlWithEmptyValueWarn();

  const { isTraqEnabled } = adminGeneralSecurityContainer.state;
  const { traqIssuerHost, traqClientId, traqClientSecret, retrieveError } =
    adminTraqSecurityContainer.state;
  const traqCallbackUrl = urljoin(
    pathUtils.removeTrailingSlash(siteUrl),
    '/passport/traq/callback',
  );

  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    reset({
      traqIssuerHost,
      traqClientId,
      traqClientSecret,
    });
  }, [reset, traqIssuerHost, traqClientId, traqClientSecret]);

  const onClickSubmit = useCallback(
    async (data) => {
      try {
        await adminTraqSecurityContainer.updateTraqSetting({
          traqIssuerHost: data.traqIssuerHost ?? '',
          traqClientId: data.traqClientId ?? '',
          traqClientSecret: data.traqClientSecret ?? '',
          isSameUsernameTreatedAsIdenticalUser:
            adminTraqSecurityContainer.state
              .isSameUsernameTreatedAsIdenticalUser,
        });
        await adminGeneralSecurityContainer.retrieveSetupStratedies();
        toastSuccess(
          t('toaster.update_successed', {
            target: 'traQ OAuth',
            ns: 'commons',
          }),
        );
      } catch (err) {
        toastError(err);
      }
    },
    [adminTraqSecurityContainer, adminGeneralSecurityContainer, t],
  );

  return (
    <form onSubmit={handleSubmit(onClickSubmit)}>
      <h2 className="alert-anchor border-bottom">traQ OAuth</h2>

      {retrieveError != null && (
        <div className="alert alert-danger">
          <p>
            {t('Error occurred')} : {retrieveError}
          </p>
        </div>
      )}

      <div className="row my-4">
        <div className="col-6 offset-3">
          <div className="form-check form-switch form-check-success">
            <input
              id="isTraqEnabled"
              className="form-check-input"
              type="checkbox"
              checked={
                adminGeneralSecurityContainer.state.isTraqEnabled || false
              }
              onChange={() => {
                adminGeneralSecurityContainer.switchIsTraqOAuthEnabled();
              }}
            />
            <label
              className="form-label form-check-label"
              htmlFor="isTraqEnabled"
            >
              traQ OAuth を有効にする
            </label>
          </div>
          {!adminGeneralSecurityContainer.state.setupStrategies.includes(
            'traq',
          ) &&
            isTraqEnabled && (
              <div className="badge text-bg-warning">
                {t('security_settings.setup_is_not_yet_complete')}
              </div>
            )}
        </div>
      </div>

      <div className="row mb-4">
        <label
          className="form-label col-12 col-md-3 text-start text-md-end py-2"
          htmlFor="traqCallbackUrl"
        >
          {t('security_settings.callback_URL')}
        </label>
        <div className="col-12 col-md-6">
          <input
            id="traqCallbackUrl"
            className="form-control"
            type="text"
            value={traqCallbackUrl}
            readOnly
          />
          <p className="form-text text-muted small">
            {t('security_settings.desc_of_callback_URL', {
              AuthName: 'OAuth',
            })}
          </p>
          {(siteUrl == null || siteUrl === '') && (
            <div className="alert alert-danger">
              <span className="material-symbols-outlined">error</span>
              <span
                // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted translation markup
                dangerouslySetInnerHTML={{
                  __html: t('alert.siteUrl_is_not_set', {
                    link: `<a href="/admin/app">${t('headers.app_settings', { ns: 'commons' })}<span class="material-symbols-outlined">login</span></a>`,
                    ns: 'commons',
                  }),
                }}
              />
            </div>
          )}
        </div>
      </div>

      {isTraqEnabled && (
        <>
          <h3 className="border-bottom mb-4">
            {t('security_settings.configuration')}
          </h3>

          <div className="row mb-4">
            <label
              htmlFor="traqIssuerHost"
              className="col-3 text-end py-2 form-label"
            >
              Issuer Host (traQ URL)
            </label>
            <div className="col-6">
              <input
                className="form-control"
                type="text"
                {...register('traqIssuerHost')}
              />
              <p className="form-text text-muted">
                <small>e.g. https://q.trap.jp</small>
              </p>
            </div>
          </div>

          <div className="row mb-4">
            <label
              htmlFor="traqClientId"
              className="col-3 text-end py-2 form-label"
            >
              {t('security_settings.clientID')}
            </label>
            <div className="col-6">
              <input
                className="form-control"
                type="text"
                {...register('traqClientId')}
              />
            </div>
          </div>

          <div className="row mb-3">
            <label
              htmlFor="traqClientSecret"
              className="col-3 text-end py-2 form-label"
            >
              {t('security_settings.client_secret')}
            </label>
            <div className="col-6">
              <input
                className="form-control"
                type="text"
                {...register('traqClientSecret')}
              />
            </div>
          </div>

          <div className="row mb-3">
            <div className="offset-3 col-6 text-start">
              <div className="form-check form-check-success">
                <input
                  id="bindByUserNameTraq"
                  className="form-check-input"
                  type="checkbox"
                  checked={
                    adminTraqSecurityContainer.state
                      .isSameUsernameTreatedAsIdenticalUser || false
                  }
                  onChange={() => {
                    adminTraqSecurityContainer.switchIsSameUsernameTreatedAsIdenticalUser();
                  }}
                />
                <label
                  className="form-check-label"
                  htmlFor="bindByUserNameTraq"
                >
                  <span
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted translation markup
                    dangerouslySetInnerHTML={{
                      __html: t(
                        'security_settings.Treat email matching as identical',
                      ),
                    }}
                  />
                </label>
              </div>
              <p className="form-text text-muted">
                <small
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted translation markup
                  dangerouslySetInnerHTML={{
                    __html: t(
                      'security_settings.Treat email matching as identical_warn',
                    ),
                  }}
                />
              </p>
            </div>
          </div>

          <div className="row mb-4">
            <div className="offset-3 col-5">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={retrieveError != null}
              >
                {t('Update')}
              </button>
            </div>
          </div>
        </>
      )}
    </form>
  );
};

const TraqSecuritySettingContentsWrapper = withUnstatedContainers(
  TraqSecuritySettingContents,
  [AdminGeneralSecurityContainer, AdminTraqSecurityContainer],
);

export default TraqSecuritySettingContentsWrapper;

import React, { useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';

import AdminTraqSecurityContainer from '~/client/services/AdminTraqSecurityContainer';
import { toastError } from '~/client/util/toastr';
import { toArrayIfNot } from '~/utils/array-utils';

import { withUnstatedContainers } from '../../UnstatedUtils';
import TraqSecuritySettingContents from './TraqSecuritySettingContents';

const TraqSecurityManagement = (props) => {
  const { adminTraqSecurityContainer } = props;

  const fetchTraqSecuritySettingsData = useCallback(async () => {
    try {
      await adminTraqSecurityContainer.retrieveSecurityData();
    } catch (err) {
      const errs = toArrayIfNot(err);
      toastError(errs);
    }
  }, [adminTraqSecurityContainer]);

  useEffect(() => {
    fetchTraqSecuritySettingsData();
  }, [fetchTraqSecuritySettingsData]);

  return <TraqSecuritySettingContents />;
};

TraqSecurityManagement.propTypes = {
  adminTraqSecurityContainer: PropTypes.instanceOf(AdminTraqSecurityContainer)
    .isRequired,
};

const TraqSecurityManagementWithUnstatedContainer = withUnstatedContainers(
  TraqSecurityManagement,
  [AdminTraqSecurityContainer],
);

export default TraqSecurityManagementWithUnstatedContainer;

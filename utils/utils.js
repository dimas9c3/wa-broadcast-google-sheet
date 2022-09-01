import _ from 'lodash';

export const sleep = async millis => {
  return new Promise(resolve => setTimeout(resolve, millis));
};

export const nullSafety = (data, prop = null) => {
  try {

    if (prop != null) {
      if (_.isNil(data[prop])) {
        return false;
      }

      if (_.isEmpty(data[prop])) {
        return false;
      }
    } else {
      if (_.isNil(data)) {
        return false;
      }

      if (_.isEmpty(data)) {
        return false;
      }
    }

    return true;
  } catch (error) {
    return false;
  }
}

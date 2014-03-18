# Add extra params on the Devise parameter sanitizer.
# For example this permits the param "accept_terms" if "must_accept_terms_on_sign_up"
# is set to true in the initalizer.

module Hive
  module ParameterSanitizer
    extend ActiveSupport::Concern

    included do
      before_filter :hive_update_sanitized_params, if: :devise_controller?
    end

    def hive_update_sanitized_params
      devise_parameter_sanitizer.for(:sign_up) << :accept_terms if Hive.must_accept_terms_on_sign_up
    end
  end
end

module Hive
  class OmniauthCallbacksController < DeviseEasyOmniauthable::OmniauthCallbacksController
    protected
      # The path used after sign up.
      def after_sign_up_path_for(resource)
        redirect_location(:after_sign_up) || super
      end
  end
end

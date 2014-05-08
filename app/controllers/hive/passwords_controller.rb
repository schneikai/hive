module Hive
  class PasswordsController < Devise::PasswordsController

    protected
      def after_resetting_password_path_for(resource)
        redirect_location(:after_resetting_password) || super
      end

      # The path used after sending reset password instructions
      def after_sending_reset_password_instructions_path_for(resource_name)
        redirect_location(:after_sending_reset_password_instructions) || super
      end
  end
end

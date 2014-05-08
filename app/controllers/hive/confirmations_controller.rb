module Hive
  class ConfirmationsController < Devise::ConfirmationsController

    protected

      # The path used after resending confirmation instructions.
      def after_resending_confirmation_instructions_path_for(resource_name)
        redirect_location(:after_resending_confirmation_instructions) || super
      end

      # The path used after confirmation.
      def after_confirmation_path_for(resource_name, resource)
        redirect_location(:after_confirmation) || super
      end
  end
end

# Provides Hive extensions for ActiveRecord.

module Hive
  module Models
    extend ActiveSupport::Concern

    module ClassMethods
      # Include the chosen hive modules in your model. This works like the Devise
      # method but it includes all the basic modules by default. It can be configured
      # just like Devise.
      def hive(*modules)
        modules = [
          :attributable, :authorizable, :avatarable, :database_authenticatable,
          :registerable, :recoverable, :rememberable, :trackable, :validatable,
          :omniauthable, :easy_omniauthable
        ]
        modules << :confirmable if Hive.must_confirm_registration
        modules << :lockable if Hive.lock_account_after_failed_logins && Hive.lock_account_after_failed_logins > 0

        devise *modules

        # Need to include our model module here so we can overwrite Devise methods.
        include Hive::Model
      end
    end
  end
end

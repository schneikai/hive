# Provides methods for all models you use with hive (call the hive(*modules) method on).

module Hive
  module Model
    extend ActiveSupport::Concern

    included do
      validates :accept_terms, acceptance: true, on: :create, if: :must_accept_terms_on_sign_up?
      before_create :ensure_registration_defaults
    end

    module ClassMethods
      # Devise uses this method to setup a new user model for registration.
      # We hook into this to allow Hive to add defaults for a new user via
      # the *registration_defaults* method below.
      def new_with_session(params, session)
        new(registration_defaults.merge(params))
      end

      # Overwrite this in your model and return all the user defaults
      # you want for new registrations.
      def registration_defaults
        { }
      end
    end

    # Hive allows to set registration details for new users via the
    # *registration_defaults* class method. This is executed when Devise
    # is creating a new user for registration but not when a new user is
    # created outside of the Devise workflow for example via the Rails console.
    # So we need to make sure that the defaults are set via this *before_create*
    # callback here.
    def ensure_registration_defaults
      self.class.registration_defaults.each do |key,value|
        self[key] ||= value
      end
    end

    def must_accept_terms_on_sign_up?
      Hive.must_accept_terms_on_sign_up
    end

    def confirmable?
      Hive.must_confirm_registration
    end

    # Returns true if the model can be deleted.
    # Configurable in the Hive initializer.
    def deletable?
      Hive.deletable
    end

    # Returns true if the current password is required to delete the user.
    # Configurable in the Hive initializer.
    def password_required_for_delete?
      Hive.delete_requires_password
    end

    def to_s
      username
    end
  end
end

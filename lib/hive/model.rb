# Provides methods for all models you use with hive (call the hive(*modules) method on).

module Hive
  module Model
    extend ActiveSupport::Concern

    included do
      validates :accept_terms, acceptance: true, on: :create, if: :must_accept_terms_on_sign_up?
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

    def must_accept_terms_on_sign_up?
      Hive.must_accept_terms_on_sign_up
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
